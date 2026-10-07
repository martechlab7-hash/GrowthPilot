import { api, readJson } from "@/server/http";
import { deleteBrand, updateBrand } from "@/server/services/brands";

export const PUT = api<{ bid: string }>({ permission: "org.manage", rpm: 30 }, async (req, auth, { bid }) => ({ brands: await updateBrand(auth, bid, await readJson(req)) }));

export const DELETE = api<{ bid: string }>({ permission: "org.manage", rpm: 30 }, async (_req, auth, { bid }) => ({ brands: await deleteBrand(auth, bid) }));
