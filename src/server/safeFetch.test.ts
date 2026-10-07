import { describe, expect, it, vi } from "vitest";

// Every hostname resolves to a loopback address, as in a DNS-rebinding attack.
vi.mock("node:dns", () => ({
  lookup: (_h: string, _o: unknown, cb: (e: null, a: { address: string; family: number }[]) => void) => cb(null, [{ address: "127.0.0.1", family: 4 }]),
}));

describe("fetchPublicPage", () => {
  it("refuses a public-looking hostname that resolves to a private address", async () => {
    const { fetchPublicPage } = await import("./safeFetch");
    await expect(fetchPublicPage("https://rebind.example.com/")).rejects.toThrow(/private network/);
  });
  it("refuses non-public URLs before any lookup", async () => {
    const { fetchPublicPage } = await import("./safeFetch");
    await expect(fetchPublicPage("http://169.254.169.254/latest")).rejects.toThrow(/public http/);
  });
});
