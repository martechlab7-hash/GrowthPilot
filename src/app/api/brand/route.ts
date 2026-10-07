import { api, readJson } from "@/server/http";
import { getBrand, listBrands, updateBrand, createBrand } from "@/server/services/brands";

/** The organisation's default brand (and all saved brands). */
export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ brand: await getBrand(auth.orgId), brands: await listBrands(auth.orgId) }));

/** Back-compatible: update the default brand, creating it if there is none. */
export const PUT = api({ permission: "org.manage" }, async (req, auth) => {
  const body = await readJson<Record<string, unknown>>(req);
  const current = (await listBrands(auth.orgId)).find((b) => b.isDefault);
  const input = { name: current?.name ?? (body.companyName as string) ?? "Default brand", ...body };
  const brands = current ? await updateBrand(auth, current.id, input) : await createBrand(auth, input);
  return { brand: await getBrand(auth.orgId), brands };
});
