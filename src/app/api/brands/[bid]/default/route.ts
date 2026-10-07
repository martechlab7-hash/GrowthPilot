import { api } from "@/server/http";
import { setDefaultBrand } from "@/server/services/brands";

export const POST = api<{ bid: string }>({ permission: "org.manage", rpm: 30 }, async (_req, auth, { bid }) => ({ brands: await setDefaultBrand(auth, bid) }));
