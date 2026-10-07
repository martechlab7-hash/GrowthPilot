import { z } from "zod";
import { api, readJson } from "@/server/http";
import { importLogo } from "@/server/services/brands";

const Body = z.object({ url: z.string().trim().min(4).max(500) });

/** Download a logo from a public link (SSRF-safe) for the browser to resize. */
export const POST = api({ permission: "org.manage", rpm: 20 }, async (req) => importLogo(Body.parse(await readJson(req)).url));
