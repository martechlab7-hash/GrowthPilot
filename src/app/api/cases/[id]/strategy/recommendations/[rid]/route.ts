import { api, readJson } from "@/server/http";
import { ReviewSchema, reviewRecommendation } from "@/server/services/strategy";

export const POST = api<{ id: string; rid: string }>({ permission: "case.manage", rpm: 30 }, async (req, auth, { id, rid }) => reviewRecommendation(auth, id, rid, ReviewSchema.parse(await readJson(req))));
