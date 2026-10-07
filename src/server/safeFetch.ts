import "server-only";
import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { isPrivateAddress, normalizeUrl } from "@/lib/web/page";

/**
 * Fetches a public HTML page for review with SSRF protection: http(s) only,
 * standard ports, every resolved address checked at connect time (so DNS
 * rebinding cannot reach a private network), redirects re-validated, a hard
 * timeout and a size cap. Only text/html is read.
 */
export class FetchBlockedError extends Error {}

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = Array.isArray(addresses) ? addresses : [{ address: String(addresses), family: 4 }];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (!list.length || bad) return callback(new FetchBlockedError("This address points to a private network and cannot be read."), "", 4);
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
    const first = list[0]!;
    callback(null, first.address, first.family);
  });
};

function getOnce(url: URL): Promise<{ status: number; location?: string; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { "user-agent": "GrowthPilotPageReview/1.0 (+marketing page review)", accept: "text/html,application/xhtml+xml" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const type = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, type, body: "" });
        }
        if (status >= 400) {
          res.resume();
          return resolve({ status, type, body: "" });
        }
        if (!/text\/html|application\/xhtml/i.test(type)) {
          res.destroy();
          return reject(new FetchBlockedError(`Not a web page (${type.split(";")[0] || "unknown type"}).`));
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            res.destroy();
            resolve({ status, type, body: Buffer.concat(chunks).toString("utf8") });
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => resolve({ status, type, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    const deadline = setTimeout(() => req.destroy(new Error("The page took too long to respond.")), TIMEOUT_MS);
    req.on("timeout", () => req.destroy(new Error("The page took too long to respond.")));
    req.on("error", (e) => {
      clearTimeout(deadline);
      reject(e);
    });
    req.on("close", () => clearTimeout(deadline));
    req.end();
  });
}

export async function fetchPublicPage(input: string): Promise<{ url: string; html: string }> {
  let current = normalizeUrl(input);
  if (!current) throw new FetchBlockedError("Only public http(s) links can be read.");
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await getOnce(new URL(current));
    if (res.location) {
      const next = normalizeUrl(new URL(res.location, current).toString());
      if (!next) throw new FetchBlockedError("The page redirected to an address that cannot be read.");
      current = next;
      continue;
    }
    if (res.status >= 400) throw new Error(`The page returned HTTP ${res.status}.`);
    return { url: current, html: res.body };
  }
  throw new Error("Too many redirects.");
}
