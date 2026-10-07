import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/domain/types";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import type { AuthContext } from "../auth";

vi.mock("../safeFetch", () => ({
  FetchBlockedError: class FetchBlockedError extends Error {},
  fetchPublicImage: async (url: string) => {
    if (url.includes("page")) {
      const { FetchBlockedError } = await import("../safeFetch");
      throw new FetchBlockedError("Unexpected content (text/html).");
    }
    return { url: `https://${url.replace(/^https?:\/\//, "")}`, type: "image/svg+xml", body: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") };
  },
}));

const svc = await import("./brands");
const cases = await import("./cases");

const now = new Date().toISOString();
const profile = (orgId: string): UserProfile => ({ id: `u-${orgId}`, organizationId: orgId, email: "a@b.c", displayName: "A", role: "owner", createdAt: now, updatedAt: now });
const authFor = (orgId: string): AuthContext => ({ uid: `u-${orgId}`, email: "a@b.c", name: "A", profile: profile(orgId), orgId });
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const base = { primaryColor: "#112233", secondaryColor: "#445566", accentColor: "#778899", fontFamily: "Inter", visualStyle: "minimal" as const, companyName: "Acme" };

describe("multiple brands", () => {
  let store: MemoryStore;
  beforeEach(async () => {
    store = new MemoryStore(undefined, true);
    setStore(store);
    for (const org of ["org1", "org2"]) await store.collection<{ id: string; plan: string }>("organizations").set({ id: org, plan: "business" });
  });

  it("reads the original single brand as the default", async () => {
    await store.collection<Record<string, unknown> & { id: string }>("brand_profiles").set({ id: "org1", organizationId: "org1", ...base, updatedAt: now, updatedBy: "u" });
    const [b] = await svc.listBrands("org1");
    expect(b).toMatchObject({ id: "org1", name: "Acme", isDefault: true, primaryColor: "#112233" });
    expect((await svc.getBrand("org1")).primaryColor).toBe("#112233");
  });

  it("creates, switches default, updates and deletes brands per organisation", async () => {
    const auth = authFor("org1");
    expect(await svc.getBrand("org1")).toMatchObject({ primaryColor: "#0F2A4A" });
    let list = await svc.createBrand(auth, { ...base, name: "Acme Retail", logoDataUrl: PNG, logoWidth: 1, logoHeight: 1 });
    list = await svc.createBrand(auth, { ...base, name: "Client: Northwind", primaryColor: "#AA0000" });
    expect(list.map((b) => [b.name, b.isDefault])).toEqual([["Acme Retail", true], ["Client: Northwind", false]]);
    await expect(svc.createBrand(auth, { ...base, name: "acme retail" })).rejects.toThrow(/already exists/);
    await expect(svc.createBrand(auth, { ...base, name: "Bad", logoDataUrl: "data:image/png;base64,aGVsbG8=" })).rejects.toThrow(/could not be read/);

    const north = list.find((b) => b.name === "Client: Northwind")!;
    expect((await svc.getBrand("org1", north.id)).primaryColor).toBe("#AA0000");
    list = await svc.setDefaultBrand(auth, north.id);
    expect(list[0]).toMatchObject({ id: north.id, isDefault: true });
    expect(list.filter((b) => b.isDefault)).toHaveLength(1);

    // Removing the logo really removes it.
    const acme = list.find((b) => b.name === "Acme Retail")!;
    list = await svc.updateBrand(auth, acme.id, { ...base, name: "Acme Retail", logoWidth: 1 });
    expect(list.find((b) => b.id === acme.id)!.logoDataUrl).toBeUndefined();
    expect(list.find((b) => b.id === acme.id)!.logoWidth).toBeUndefined();

    // Another organisation can neither see nor change these brands.
    expect(await svc.listBrands("org2")).toEqual([]);
    await expect(svc.updateBrand(authFor("org2"), acme.id, { ...base, name: "Mine" })).rejects.toThrow(/not found/i);
    expect((await svc.getBrand("org2", acme.id)).primaryColor).toBe("#0F2A4A");

    // Deleting the default promotes another brand.
    list = await svc.deleteBrand(auth, north.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: acme.id, isDefault: true });
  });

  it("lets a case use a specific brand", async () => {
    const auth = authFor("org1");
    const list = await svc.createBrand(auth, { ...base, name: "Client A", primaryColor: "#00AA00" });
    const c = await cases.createCase(auth, { name: "Brand case", problemStatement: "Customer retention has declined by 12% this year.", currency: "USD" });
    await expect(cases.updateCase(auth, c.id, { brandId: "brand_missing" })).rejects.toThrow(/no longer exists/);
    const updated = await cases.updateCase(auth, c.id, { brandId: list[0]!.id });
    expect(updated.case.brandId).toBe(list[0]!.id);
    expect((await svc.getBrand("org1", updated.case.brandId)).primaryColor).toBe("#00AA00");
    const cleared = await cases.updateCase(auth, c.id, { brandId: null });
    expect(cleared.case.brandId).toBeUndefined();
  });

  it("imports a logo from a link and explains links that aren't images", async () => {
    const out = await svc.importLogo("cdn.example.com/logo.svg");
    expect(out.dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(out.sourceUrl).toBe("https://cdn.example.com/logo.svg");
    await expect(svc.importLogo("https://example.com/page")).rejects.toThrow(/isn't an image/);
  });
});
