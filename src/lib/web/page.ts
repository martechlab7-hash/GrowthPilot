import { isIP } from "node:net";

/**
 * Pure helpers for reading a public web page: URL policy, private-address
 * detection and a light HTML reader that extracts what a marketer would look
 * at (headline, calls to action, forms, offers, trust signals). No network.
 */

export const MAX_LINKS = 5;

/** Normalise a user-entered URL, or return null when it is not a public http(s) URL. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(".") && !isIP(host)) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return null;
  if (isIP(host) && isPrivateAddress(host)) return null;
  u.hash = "";
  return u.toString().slice(0, 500);
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and metadata addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    const mapped = /^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    if (s === "::" || s === "::1") return true;
    return /^(f[cd]|fe[89ab]|ff)/.test(s) || s.startsWith("64:ff9b:") || s.startsWith("2001:db8");
  }
  return true;
}

export interface PageFacts {
  title?: string;
  description?: string;
  headings: string[];
  ctas: string[];
  forms: number;
  formFields: number;
  offers: string[];
  words: number;
  images: number;
  trustSignals: string[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "-", mdash: "-", hellip: "..." };
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const uniq = (xs: string[], n: number, max = 120) => [...new Set(xs.map((x) => x.slice(0, max)).filter((x) => x.length > 1))].slice(0, n);

const CTA_WORDS = /\b(buy|shop|order|add to (cart|bag|basket)|checkout|sign ?up|register|join|get started|start|try|book|demo|subscribe|download|install|get the app|contact|talk to|request|apply|claim|redeem|upgrade|learn more|see plans|compare)\b/i;
const OFFER = /(\d+\s?%\s?off|\bfree (trial|shipping|delivery)\b|\bsave\s[$€£₹]?\d|\bcode\s+[A-Z0-9]{3,}|\bcashback\b|\bdiscount\b|\bbuy one get\b|\blimited time\b|\bsale\b|\bfree\b)/i;
const TRUST = /(review|rating|testimonial|trusted by|customers|secure (checkout|payment)|money.?back|guarantee|certified|award|as seen in|returns?\b|refund)/i;

/** Read the parts of a page a marketer would look at. */
export function readPage(html: string): PageFacts {
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
  const meta = (name: string) =>
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i").exec(clean)?.[0].match(/content=["']([^"']*)["']/i)?.[1];
  const title = text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(clean)?.[1] ?? "") || decode(meta("og:title") ?? "");
  const description = decode(meta("description") ?? meta("og:description") ?? "").trim();
  const headings = uniq([...clean.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => `H${m[1]}: ${text(m[2] ?? "")}`).filter((h) => h.length > 4), 10);
  const clickables = [
    ...[...clean.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => text(m[1] ?? "")),
    ...[...clean.matchAll(/<input[^>]+type=["']?submit["']?[^>]*>/gi)].map((m) => decode(/value=["']([^"']*)["']/i.exec(m[0])?.[1] ?? "")),
    ...[...clean.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => text(m[1] ?? "")).filter((t) => t.length <= 40 && CTA_WORDS.test(t)),
  ];
  const ctas = uniq(clickables.filter((t) => t.length <= 40 && CTA_WORDS.test(t)), 10);
  const forms = (clean.match(/<form\b/gi) ?? []).length;
  const formFields = (clean.match(/<(input(?![^>]+type=["']?(hidden|submit|button)\b))|<select\b|<textarea\b/gi) ?? []).length;
  const body = text(/<body[^>]*>([\s\S]*)<\/body>/i.exec(clean)?.[1] ?? clean);
  const sentences = body.split(/(?<=[.!?])\s+|\s{2,}/);
  const offers = uniq(sentences.filter((s) => OFFER.test(s) && s.length <= 160), 5, 160);
  const trustSignals = uniq(sentences.filter((s) => TRUST.test(s) && s.length <= 120), 5);
  return {
    ...(title ? { title: title.slice(0, 200) } : {}),
    ...(description ? { description: description.slice(0, 300) } : {}),
    headings,
    ctas,
    forms,
    formFields,
    offers,
    words: body ? body.split(/\s+/).length : 0,
    images: (clean.match(/<img\b/gi) ?? []).length,
    trustSignals,
  };
}

/** One-paragraph summary of the extracted facts, for agents and the UI. */
export function describePage(url: string, f: PageFacts): string {
  return [
    `${url}${f.title ? ` "${f.title}"` : ""}`,
    f.description ? `Meta description: ${f.description}` : "No meta description",
    f.headings.length ? `Headings: ${f.headings.slice(0, 6).join(" / ")}` : "No headings found",
    f.ctas.length ? `Calls to action: ${f.ctas.join(", ")}` : "No clear call-to-action buttons found",
    `${f.forms} form(s) with ${f.formFields} visible field(s)`,
    f.offers.length ? `Offers: ${f.offers.join(" / ")}` : "No offer text found",
    f.trustSignals.length ? `Trust signals: ${f.trustSignals.join(" / ")}` : "No trust signals found",
    `~${f.words} words, ${f.images} images`,
  ].join(". ");
}
