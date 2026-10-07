import { api, readJson } from "@/server/http";
import { createBrand, listBrands } from "@/server/services/brands";

export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ brands: await listBrands(auth.orgId) }));

export const POST = api({ permission: "org.manage", rpm: 30 }, async (req, auth) => ({ brands: await createBrand(auth, await readJson(req)) }));
