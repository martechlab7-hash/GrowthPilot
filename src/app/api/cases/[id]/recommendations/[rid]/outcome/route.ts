import { api, readJson } from "@/server/http";
import { OutcomeInputSchema, recordOutcome } from "@/server/services/cases";

export const PUT = api<{ id: string; rid: string }>({ permission: "case.contribute" }, async (req, auth, { id, rid }) =>
  recordOutcome(auth, id, rid, OutcomeInputSchema.parse(await readJson(req))),
);
