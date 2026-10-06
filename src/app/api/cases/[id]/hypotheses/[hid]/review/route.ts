import { api, readJson } from "@/server/http";
import { ReviewSchema, reviewHypothesis } from "@/server/services/cases";

export const maxDuration = 120;

/** Human-in-the-loop approval gate: agree / partially agree / disagree / edit. */
export const POST = api<{ id: string; hid: string }>({ permission: "case.manage", rpm: 30 }, async (req, auth, { id, hid }) =>
  reviewHypothesis(auth, id, hid, ReviewSchema.parse(await readJson(req))),
);
