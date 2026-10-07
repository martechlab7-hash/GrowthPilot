import "server-only";
import { BrandInputSchema, DEFAULT_BRAND, type Brand, type BrandProfile } from "@/domain/types";
import { isValidPng } from "@/reports/brandAssets";
import type { AuthContext } from "../auth";
import { badRequest, HttpError, notFound } from "../errors";
import { fetchPublicImage, FetchBlockedError } from "../safeFetch";
import { getStore } from "../store";
import { audit } from "./org";

/**
 * Saved brands. An organisation can keep several (one per client, sub-brand
 * or product line) and pick one per case; one is the default. The first
 * version of the product stored a single brand under the organisation id;
 * that document is read as the default brand, so nothing needs migrating.
 */

export const MAX_BRANDS = 20;

type BrandDoc = BrandProfile & { id: string; organizationId: string; name?: string; isDefault?: boolean; updatedAt: string; updatedBy: string };

const col = () => getStore().collection<BrandDoc>("brand_profiles");

function toBrand(d: BrandDoc, legacyDefault: boolean): Brand {
  const { organizationId: _o, updatedBy: _b, name, isDefault, ...rest } = d;
  void _o; void _b;
  return { ...DEFAULT_BRAND, ...rest, name: name || d.companyName || "Default brand", isDefault: isDefault ?? legacyDefault };
}

export async function listBrands(orgId: string): Promise<Brand[]> {
  const docs = await col().query({ where: [["organizationId", "==", orgId]] });
  const hasDefault = docs.some((d) => d.isDefault);
  const brands = docs.map((d) => toBrand(d, !hasDefault && d.id === orgId));
  if (brands.length && !brands.some((b) => b.isDefault)) brands[0]!.isDefault = true;
  return brands.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

/** The brand to render with: the requested one, else the organisation default, else the product default. */
export async function getBrand(orgId: string, brandId?: string): Promise<BrandProfile> {
  const brands = await listBrands(orgId);
  const b = (brandId && brands.find((x) => x.id === brandId)) || brands.find((x) => x.isDefault);
  if (!b) return DEFAULT_BRAND;
  const { id: _i, name: _n, isDefault: _d, updatedAt: _u, ...profile } = b;
  void _i; void _n; void _d; void _u;
  return profile;
}

function parse(input: unknown) {
  const brand = BrandInputSchema.parse(input);
  if (brand.logoDataUrl && !isValidPng(Buffer.from(brand.logoDataUrl.slice(brand.logoDataUrl.indexOf(",") + 1), "base64"))) {
    throw badRequest("The logo file could not be read. Upload a PNG, JPG, SVG or WebP image.");
  }
  if (!brand.logoDataUrl) {
    delete brand.logoWidth;
    delete brand.logoHeight;
    delete brand.logoSourceUrl;
  }
  return brand;
}

export async function createBrand(auth: AuthContext, input: unknown): Promise<Brand[]> {
  const brand = parse(input);
  const existing = await listBrands(auth.orgId);
  if (existing.length >= MAX_BRANDS) throw badRequest(`You can save up to ${MAX_BRANDS} brands. Delete one first.`);
  if (existing.some((b) => b.name.toLowerCase() === brand.name.toLowerCase())) throw badRequest(`A brand called "${brand.name}" already exists.`);
  const id = `brand_${crypto.randomUUID().slice(0, 10)}`;
  await col().set({ ...brand, id, organizationId: auth.orgId, isDefault: existing.length === 0, updatedAt: new Date().toISOString(), updatedBy: auth.uid });
  await audit(auth.orgId, auth.uid, "brand.create", id, { name: brand.name });
  return listBrands(auth.orgId);
}

async function own(auth: AuthContext, id: string): Promise<BrandDoc> {
  const d = await col().get(id);
  if (!d || d.organizationId !== auth.orgId) throw notFound("Brand");
  return d;
}

export async function updateBrand(auth: AuthContext, id: string, input: unknown): Promise<Brand[]> {
  const current = await own(auth, id);
  const brand = parse(input);
  const others = (await listBrands(auth.orgId)).filter((b) => b.id !== id);
  if (others.some((b) => b.name.toLowerCase() === brand.name.toLowerCase())) throw badRequest(`A brand called "${brand.name}" already exists.`);
  const isDefault = (await listBrands(auth.orgId)).find((b) => b.id === id)?.isDefault ?? false;
  // Replace the whole document so removed fields (e.g. a deleted logo) are really gone.
  await col().set({ ...brand, id, organizationId: current.organizationId, isDefault, updatedAt: new Date().toISOString(), updatedBy: auth.uid });
  await audit(auth.orgId, auth.uid, "brand.update", id, { name: brand.name });
  return listBrands(auth.orgId);
}

export async function setDefaultBrand(auth: AuthContext, id: string): Promise<Brand[]> {
  await own(auth, id);
  for (const b of await listBrands(auth.orgId)) {
    if (b.isDefault !== (b.id === id)) await col().update(b.id, { isDefault: b.id === id });
  }
  await audit(auth.orgId, auth.uid, "brand.default", id);
  return listBrands(auth.orgId);
}

export async function deleteBrand(auth: AuthContext, id: string): Promise<Brand[]> {
  await own(auth, id);
  const wasDefault = (await listBrands(auth.orgId)).find((b) => b.id === id)?.isDefault;
  await col().delete(id);
  const rest = await listBrands(auth.orgId);
  if (wasDefault && rest[0]) await col().update(rest[0].id, { isDefault: true });
  await audit(auth.orgId, auth.uid, "brand.delete", id);
  return listBrands(auth.orgId);
}

/**
 * Fetch a logo from a public link and hand it back as a data URL. The browser
 * then resizes it to a PNG exactly like an uploaded file, so stored logos are
 * always validated PNGs and nothing is hot-linked at export time.
 */
export async function importLogo(url: string): Promise<{ dataUrl: string; sourceUrl: string }> {
  try {
    const { url: final, type, body } = await fetchPublicImage(url);
    if (!body.length) throw badRequest("That link returned an empty file.");
    return { dataUrl: `data:${type};base64,${body.toString("base64")}`, sourceUrl: final };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof FetchBlockedError) throw badRequest(/Unexpected content/.test(err.message) ? "That link isn't an image. Use a direct link to a PNG, JPG, SVG or WebP file." : err.message);
    const m = err instanceof Error ? err.message : String(err);
    if (/ENOTFOUND|EAI_AGAIN/.test(m)) throw badRequest("That address could not be found.");
    if (/HTTP \d+/.test(m)) throw badRequest(`The logo link could not be opened (${m.match(/HTTP \d+/)![0]}).`);
    throw badRequest("The logo could not be downloaded from that link.");
  }
}
