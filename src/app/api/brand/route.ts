import { api, readJson } from "@/server/http";
import { getBrand, saveBrand } from "@/server/services/org";

export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ brand: await getBrand(auth.orgId) }));

export const PUT = api({ permission: "org.manage" }, async (req, auth) => ({ brand: await saveBrand(auth, await readJson(req)) }));
