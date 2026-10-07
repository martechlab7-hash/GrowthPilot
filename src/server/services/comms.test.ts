import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIGateway } from "@/ai/gateway";
import type { ChatRequest, ProviderAdapter } from "@/ai/types";
import type { UserProfile } from "@/domain/types";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import type { AuthContext } from "../auth";

const seen: ChatRequest[] = [];
let visionFails = false;

function fixture(req: ChatRequest): unknown {
  const sys = req.system;
  const prompt = req.messages[0]!.content;
  if (sys.includes("Extract structured facts")) return { facts: [], problemTypes: [] };
  if (sys.includes("Interview Planner")) return { metric: "win-back rate", focus: "Why lapsed customers don't return.", questions: [] };
  if (sys.includes("screenshots of the client's real customer communications")) {
    if (visionFails) throw Object.assign(new Error("This model does not support image input"), { vision: true });
    const n = req.messages[0]!.images?.length ?? 0;
    return {
      reviews: Array.from({ length: n }, (_, index) => ({ index, summary: `Win-back email ${index + 1}`, channel: "Email", cta: "Shop now", personalisation: "First name only", strengths: ["Clear offer"], issues: ["Three competing CTAs"], ideas: ["One CTA"] })),
      overall: "Messages lead with discounts, not reasons to return.",
    };
  }
  if (sys.includes("reviewing the client's web pages")) {
    const urls = [...prompt.matchAll(/https:\/\/[^\s"]+/g)].map((m) => m[0]);
    return { pages: [...new Set(urls)].map((url) => ({ url, summary: "Product page for running shoes", cta: "Shop now", strengths: ["Offer above the fold"], issues: ["No reviews near the CTA"], ideas: ["Add ratings"] })) };
  }
  throw new Error(`Unexpected agent: ${sys.slice(0, 80)}`);
}

const fake: ProviderAdapter = {
  kind: "openai",
  async complete(req) {
    seen.push(req);
    try {
      return { text: JSON.stringify(fixture(req)), inputTokens: 10, outputTokens: 10, model: "fake" };
    } catch (err) {
      const { AIProviderError } = await import("@/ai/types");
      throw new AIProviderError((err as Error).message, "openai", 400, false);
    }
  },
};

vi.mock("./providers", async (orig) => {
  const actual = await orig<typeof import("./providers")>();
  return {
    ...actual,
    gatewayFor: async () => new AIGateway({ providers: [{ id: "p", kind: "openai", label: "Fake", models: { fast: "f", reasoning: "r", large: "l" }, credentials: { apiKey: "k" } }], adapterFor: () => fake, backoffMs: 1 }),
  };
});

const pagesServed: string[] = [];
vi.mock("../safeFetch", () => ({
  FetchBlockedError: class FetchBlockedError extends Error {},
  fetchPublicPage: async (url: string) => {
    pagesServed.push(url);
    if (url.includes("broken")) throw new Error("getaddrinfo ENOTFOUND broken.example.com");
    return { url, html: "<title>Trail shoes</title><h1>Run further</h1><p>20% off today.</p><a>Shop now</a>" };
  },
}));

const svc = await import("./cases");
const comms = await import("./comms");
const { buildAgentContext } = await import("@/ai/agents/context");
const { nextQuestions } = await import("@/engine/interview");

const now = new Date().toISOString();
const profile = (orgId: string): UserProfile => ({ id: `u-${orgId}`, organizationId: orgId, email: "a@b.c", displayName: "A", role: "owner", createdAt: now, updatedAt: now });
const authFor = (orgId: string): AuthContext => ({ uid: `u-${orgId}`, email: "a@b.c", name: "A", profile: profile(orgId), orgId });
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("communications in the interview", () => {
  beforeEach(async () => {
    const store = new MemoryStore(undefined, true);
    setStore(store);
    for (const org of ["org1", "org2"]) await store.collection<{ id: string; plan: string }>("organizations").set({ id: org, plan: "business" });
    seen.length = 0;
    pagesServed.length = 0;
    visionFails = false;
  });

  it("asks for links, screenshots and cadence by case type, and reviews them", async () => {
    const auth = authFor("org1");
    const c = await svc.createCase(auth, { name: "Win-back", problemStatement: "Lapsed customers are not coming back. Our win-back emails get opened but nobody returns to purchase, and checkout conversion dropped.", currency: "USD" });
    expect(c.problemTypes).toEqual(expect.arrayContaining(["winback", "conversion"]));

    // Before channels are known, screenshot and calendar questions wait.
    let qs = nextQuestions(c, 500);
    expect(qs.find((q) => q.id === "mkt-links")?.prompt).toMatch(/drop off/);
    expect(qs.some((q) => q.id === "mkt-screenshots" || q.id === "mkt-cadence")).toBe(false);

    await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-channels", value: ["Email", "SMS", "Push"] }] });
    let cur = (await svc.getCase(auth, c.id)).case;
    qs = nextQuestions(cur, 500);
    expect(qs.find((q) => q.id === "mkt-screenshots")?.prompt).toMatch(/lapsed customer|win-back/i);
    const cadenceQ = qs.find((q) => q.id === "mkt-cadence")!;
    expect(cadenceQ.prompt).toMatch(/start to lapse/);
    // The calendar starts with one row per messaging channel.
    expect(cadenceQ.suggested).toEqual(["Email | - | Weekly | Varies | Scheduled", "SMS | - | Weekly | Varies | Scheduled", "Push | - | Weekly | Varies | Scheduled"]);

    // Links: validated, normalised, read in code and reviewed.
    await expect(svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-links", value: ["http://localhost/admin"] }] })).rejects.toThrow(/public web addresses/);
    const afterLinks = await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-links", value: ["shop.example.com/shoes", "https://broken.example.com"] }] });
    expect(pagesServed).toEqual(["https://shop.example.com/shoes", "https://broken.example.com/"]);
    const [good, bad] = afterLinks.case.comms!.pages;
    expect(good).toMatchObject({ status: "reviewed", title: "Trail shoes" });
    expect(good!.facts!.ctas).toEqual(["Shop now"]);
    expect(good!.review!.issues).toEqual(["No reviews near the CTA"]);
    expect(bad).toMatchObject({ status: "failed", error: "The address could not be found." });

    // Screenshots: uploaded, validated by content, reviewed by the vision model.
    await expect(comms.uploadScreenshot(auth, c.id, { name: "x.png", dataUrl: "data:image/png;base64,aGVsbG8=" })).rejects.toThrow(/not a valid image/);
    const { screenshot } = await comms.uploadScreenshot(auth, c.id, { name: "winback.png", channel: "Email", dataUrl: PNG });
    await expect(svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-screenshots", value: ["img_doesnotexist"] }] })).rejects.toThrow(/not found/);
    const afterShots = await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-screenshots", value: [screenshot.id] }] });
    const reviewed = afterShots.case.comms!.screenshots[0]!;
    expect(reviewed.status).toBe("reviewed");
    expect(reviewed.review!.issues).toEqual(["Three competing CTAs"]);
    const visionCall = seen.find((r) => r.messages[0]!.images?.length);
    expect(visionCall!.messages[0]!.images![0]!.mediaType).toBe("image/png");
    expect(afterShots.case.transcript.at(-1)!.text).toBe("Shared 1 message screenshot");

    // Cadence: validated rows; the implied contact frequency is recorded as an inference.
    await expect(svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-cadence", value: ["Email | x | whenever"] }] })).rejects.toThrow(/channel and a frequency/);
    await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-cadence", value: ["Email | Offers | Several times a week | Tue/Thu 10:00 | Scheduled", "SMS | Flash sale | Weekly | Tue 10:00 | Scheduled"] }] });
    cur = (await svc.getCase(auth, c.id)).case;
    expect(cur.context.fields["marketing.contact_frequency"]).toMatchObject({ value: "Several times a week", kind: "inference" });
    // The calendar answers the simpler frequency question, so it is not asked again.
    expect(nextQuestions(cur, 500).some((q) => q.id === "mkt-frequency")).toBe(false);

    // Every agent sees the reviews and the computed cadence findings.
    const ctx = buildAgentContext(cur);
    expect(ctx.communications?.cadence_analysis?.join(" ")).toContain("about 4 a week");
    expect(ctx.communications?.cadence_analysis?.join(" ")).toContain("inactivity or lapse");
    expect(ctx.communications?.screenshots?.[0]?.issues).toEqual(["Three competing CTAs"]);
    expect(ctx.communications?.pages?.[0]?.read_from_html).toContain("Shop now");
    expect(JSON.stringify(ctx)).not.toContain(screenshot.id);

    // Images are only served to the owning organisation.
    const res = await comms.getScreenshot(auth, c.id, screenshot.id);
    expect(res.headers.get("content-type")).toBe("image/png");
    await expect(comms.getScreenshot(authFor("org2"), c.id, screenshot.id)).rejects.toThrow(/not found/i);

    // Removing a screenshot removes the image, its review and the answer.
    const removed = await comms.removeScreenshot(auth, c.id, screenshot.id);
    expect(removed.case.comms!.screenshots).toEqual([]);
    expect(removed.case.context.fields["marketing.comm_screenshots"]).toBeUndefined();
    await expect(comms.getScreenshot(auth, c.id, screenshot.id)).rejects.toThrow(/not found/i);
  });

  it("explains when the model cannot read images", async () => {
    const auth = authFor("org1");
    const c = await svc.createCase(auth, { name: "Win-back", problemStatement: "Lapsed customers are not coming back after our win-back emails.", currency: "USD" });
    await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-channels", value: ["Email"] }] });
    const { screenshot } = await comms.uploadScreenshot(auth, c.id, { name: "a.png", dataUrl: PNG });
    visionFails = true;
    const out = await svc.answerQuestions(auth, c.id, { answers: [{ questionId: "mkt-screenshots", value: [screenshot.id] }] });
    expect(out.case.comms!.screenshots[0]).toMatchObject({ status: "failed" });
    expect(out.case.comms!.screenshots[0]!.error).toMatch(/vision-capable model/);
  });

  it("deletes stored images with the case", async () => {
    const auth = authFor("org1");
    const c = await svc.createCase(auth, { name: "Win-back", problemStatement: "Lapsed customers are not coming back after our win-back emails.", currency: "USD" });
    const { screenshot } = await comms.uploadScreenshot(auth, c.id, { name: "a.png", dataUrl: PNG });
    await svc.deleteCase(auth, c.id);
    const { getStore } = await import("../store");
    expect(await getStore().collection("case_assets").get(screenshot.id)).toBeNull();
  });
});
