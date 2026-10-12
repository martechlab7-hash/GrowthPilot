import { z } from "zod";
import { api, readJson } from "@/server/http";
import { approve } from "@/server/services/strategy";

const Body = z.object({ note: z.string().trim().max(1000).optional() });

export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, async (req, auth, { id }) => approve(auth, id, Body.parse(await readJson(req)).note));
