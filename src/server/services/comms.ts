import "server-only";
import { z } from "zod";
import * as agents from "@/ai/agents";
import { AIUnavailableError, type ChatImage } from "@/ai/types";
import type { Case, CommsScreenshot, PageReview } from "@/domain/types";
import { describePage, readPage, MAX_LINKS } from "@/lib/web/page";
import type { AuthContext } from "../auth";
import { inBackground } from "../background";
import { badRequest, notFound } from "../errors";
import { log } from "../logger";
import { fetchPublicPage, FetchBlockedError } from "../safeFetch";
import { getStore } from "../store";
import { audit } from "./org";
import { loadCase, mutate, withAi, withDerived } from "./cases";

/**
 * Communication screenshots and linked pages shared in the interview. Images
 * are stored server-only in case_assets and served through an access-checked
 * route; the case keeps metadata and Pilot's reviews. Reviews run in the
 * background so the interview never waits on them.
 */

export const MAX_SCREENSHOTS = 6;
const MAX_IMAGE_BYTES = 900_000;

interface CaseAsset {
  id: string;
  organizationId: string;
  caseId: string;
  mediaType: CommsScreenshot["mediaType"];
  /** Base64, no data: prefix. */
  data: string;
  createdAt: string;
}

const assets = () => getStore().collection<CaseAsset>("case_assets");
const now = () => new Date().toISOString();
const emptyComms = (): NonNullable<Case["comms"]> => ({ screenshots: [], pages: [] });

export const ScreenshotInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  channel: z.string().trim().max(40).optional(),
  dataUrl: z.string().max(1_300_000),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

/** Magic bytes, so a renamed file cannot pose as an image. */
function sniff(buf: Buffer): CommsScreenshot["mediaType"] | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function uploadScreenshot(auth: AuthContext, caseId: string, input: z.infer<typeof ScreenshotInputSchema>) {
  const current = await loadCase(auth, caseId);
  if ((current.comms?.screenshots.length ?? 0) >= MAX_SCREENSHOTS) throw badRequest(`A case can hold up to ${MAX_SCREENSHOTS} screenshots. Remove one first.`);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(input.dataUrl);
  if (!m) throw badRequest("Upload a JPEG, PNG or WebP image.");
  const buf = Buffer.from(m[2]!, "base64");
  if (buf.length > MAX_IMAGE_BYTES) throw badRequest("That image is too large. Crop it or use a smaller screenshot.");
  const mediaType = sniff(buf);
  if (!mediaType) throw badRequest("That file is not a valid image.");
  const shot: CommsScreenshot = {
    id: `img_${crypto.randomUUID().slice(0, 12)}`,
    name: input.name,
    ...(input.channel ? { channel: input.channel } : {}),
    mediaType,
    sizeBytes: buf.length,
    ...(input.width ? { width: input.width } : {}),
    ...(input.height ? { height: input.height } : {}),
    createdAt: now(),
    createdBy: auth.uid,
    status: "pending",
  };
  await assets().set({ id: shot.id, organizationId: auth.orgId, caseId, mediaType, data: buf.toString("base64"), createdAt: shot.createdAt });
  await mutate(auth, caseId, (c) => {
    const comms = c.comms ?? emptyComms();
    return { ...c, comms: { ...comms, screenshots: [...comms.screenshots, shot] } };
  });
  await audit(auth.orgId, auth.uid, "case.screenshot.add", caseId, { asset: shot.id, bytes: shot.sizeBytes });
  return { screenshot: shot };
}

export async function getScreenshot(auth: AuthContext, caseId: string, assetId: string): Promise<Response> {
  await loadCase(auth, caseId);
  const a = await assets().get(assetId);
  if (!a || a.organizationId !== auth.orgId || a.caseId !== caseId) throw notFound("Screenshot");
  return new Response(new Uint8Array(Buffer.from(a.data, "base64")), {
    headers: { "content-type": a.mediaType, "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}

export async function removeScreenshot(auth: AuthContext, caseId: string, assetId: string) {
  await loadCase(auth, caseId);
  const a = await assets().get(assetId);
  if (a && a.organizationId === auth.orgId && a.caseId === caseId) await assets().delete(assetId);
  const updated = await mutate(auth, caseId, (c) => {
    const comms = c.comms ?? emptyComms();
    const field = c.context.fields["marketing.comm_screenshots"];
    const fields = { ...c.context.fields };
    if (field && Array.isArray(field.value)) {
      const rest = field.value.filter((v) => v !== assetId);
      if (rest.length) fields["marketing.comm_screenshots"] = { ...field, value: rest };
      else delete fields["marketing.comm_screenshots"];
    }
    return { ...c, context: { ...c.context, fields }, comms: { ...comms, screenshots: comms.screenshots.filter((s) => s.id !== assetId) } };
  });
  await audit(auth.orgId, auth.uid, "case.screenshot.remove", caseId, { asset: assetId });
  return withDerived(updated);
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

/** Read each linked page (in code), then let the model review what was read. */
export async function reviewLinkedPages(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  const urls = linkedUrls(c);
  if (!urls.length) return withDerived(c);
  const kept = new Map((c.comms?.pages ?? []).map((p) => [p.url, p]));
  // Show the pages as "being read" straight away.
  await savePages(auth, caseId, urls.map((url) => ({ ...(kept.get(url) ?? {}), url, status: "pending", checkedAt: now() })));
  const pages: PageReview[] = await Promise.all(
    urls.map(async (url): Promise<PageReview> => {
      try {
        const { html } = await fetchPublicPage(url);
        const { title, ...facts } = readPage(html);
        return { url, status: "read", checkedAt: now(), ...(title ? { title } : {}), facts };
      } catch (err) {
        const blocked = err instanceof FetchBlockedError;
        log("info", "comms.page_fetch_failed", { caseId, message: (err as Error).message });
        const prev = kept.get(url);
        // Keep an earlier successful read when a re-check fails.
        if (prev?.facts) return prev;
        return { url, status: blocked ? "blocked" : "failed", checkedAt: now(), error: friendlyFetchError(err) };
      }
    }),
  );
  let updated = await savePages(auth, caseId, pages);

  const readable = pages.filter((p) => p.facts);
  if (readable.length) {
    try {
      const reviews = await withAi(auth, updated, "page_review", (deps) =>
        agents.reviewPages(deps, updated, readable.map((p) => ({ url: p.url, description: describePage(p.url, { ...p.facts!, ...(p.title ? { title: p.title } : {}) }) }))),
        { flagPending: false },
      );
      updated = await savePages(auth, caseId, pages.map((p) => (reviews[p.url] ? { ...p, status: "reviewed", review: reviews[p.url] } : p)));
    } catch (err) {
      // Without AI the facts read from each page are still useful.
      log("info", "comms.page_review_skipped", { caseId, message: (err as Error).message });
    }
  }
  return withDerived(updated);
}

function linkedUrls(c: Case): string[] {
  const v = c.context.fields["marketing.website_links"]?.value;
  return (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).slice(0, MAX_LINKS);
}

async function savePages(auth: AuthContext, caseId: string, pages: PageReview[]) {
  return mutate(auth, caseId, (c) => {
    const comms = c.comms ?? emptyComms();
    const urls = new Set(linkedUrls(c));
    // Only pages still linked in the answer are kept.
    return { ...c, comms: { ...comms, pages: pages.filter((p) => urls.has(p.url)) }, analysisStale: c.analysisStale || !!c.diagnosis };
  });
}

function friendlyFetchError(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (err instanceof FetchBlockedError) return m;
  if (/ENOTFOUND|EAI_AGAIN/.test(m)) return "The address could not be found.";
  if (/ECONNREFUSED|ECONNRESET|socket hang up/.test(m)) return "The site refused the connection.";
  if (/CERT|SSL|TLS/i.test(m)) return "The site's security certificate could not be verified.";
  return m.slice(0, 200);
}

/** Review every screenshot that has not been reviewed yet (or all of them when `all`). */
export async function reviewScreenshots(auth: AuthContext, caseId: string, opts: { all?: boolean } = {}) {
  const c = await loadCase(auth, caseId);
  const shots = (c.comms?.screenshots ?? []).filter((s) => opts.all || s.status !== "reviewed");
  if (!shots.length) return withDerived(c);
  const loaded = await Promise.all(shots.map(async (s) => ({ s, a: await assets().get(s.id) })));
  const usable = loaded.filter((x): x is { s: CommsScreenshot; a: CaseAsset } => !!x.a && x.a.organizationId === auth.orgId);
  const images: { channel?: string; name: string; image: ChatImage }[] = usable.map(({ s, a }) => ({
    ...(s.channel ? { channel: s.channel } : {}),
    name: s.name,
    image: { mediaType: a.mediaType, data: a.data },
  }));
  try {
    const out = await withAi(auth, c, "comms_review", (deps) => agents.reviewScreenshots(deps, c, images), { flagPending: false });
    const byId = new Map(usable.map(({ s }, i) => [s.id, out.reviews[i]]));
    const updated = await mutate(auth, caseId, (cur) => {
      const comms = cur.comms ?? emptyComms();
      return {
        ...cur,
        analysisStale: cur.analysisStale || !!cur.diagnosis,
        comms: {
          ...comms,
          ...(out.overall ? { overall: out.overall } : {}),
          screenshots: comms.screenshots.map((s): CommsScreenshot => {
            if (!byId.has(s.id)) return s;
            const review = byId.get(s.id);
            const { error: _e, ...rest } = s;
            void _e;
            return review ? { ...rest, status: "reviewed", review } : { ...rest, status: "failed", error: "The model did not return a review for this image." };
          }),
        },
      };
    });
    return withDerived(updated);
  } catch (err) {
    // The gateway's own message is generic; the provider's reason is in the attempts.
    const message = err instanceof AIUnavailableError && err.attempts.length ? err.attempts.at(-1)! : err instanceof Error ? err.message : String(err);
    const hint = /image|vision|multimodal|content type|image_url|does not support/i.test(message)
      ? "Your AI model could not read images. Choose a vision-capable model (e.g. GPT-5, Claude, Gemini) in Settings → AI Providers."
      : message.slice(0, 300);
    const updated = await mutate(auth, caseId, (cur) => {
      const comms = cur.comms ?? emptyComms();
      const ids = new Set(shots.map((s) => s.id));
      return { ...cur, comms: { ...comms, screenshots: comms.screenshots.map((s) => (ids.has(s.id) ? { ...s, status: "failed" as const, error: hint } : s)) } };
    });
    return withDerived(updated);
  }
}

/** Kick off reviews after the interview saves links or screenshots. */
export async function reviewAfterAnswer(auth: AuthContext, caseId: string, kinds: { pages?: boolean; screenshots?: boolean }) {
  if (kinds.pages) await inBackground("comms.pages", () => reviewLinkedPages(auth, caseId));
  if (kinds.screenshots) await inBackground("comms.screenshots", () => reviewScreenshots(auth, caseId));
}
