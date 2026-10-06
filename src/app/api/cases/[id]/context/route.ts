import { api, readJson } from "@/server/http";
import { ContextEditSchema, editContext } from "@/server/services/cases";

/** Add or correct a fact/assumption in the case context. */
export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 60 }, async (req, auth, { id }) =>
  editContext(auth, id, ContextEditSchema.parse(await readJson(req))),
);
