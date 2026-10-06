import { api, readJson } from "@/server/http";
import { RecommendationEditSchema, updateRecommendation } from "@/server/services/cases";

export const PATCH = api<{ id: string; rid: string }>({ permission: "case.manage" }, async (req, auth, { id, rid }) =>
  updateRecommendation(auth, id, rid, RecommendationEditSchema.parse(await readJson(req))),
);
