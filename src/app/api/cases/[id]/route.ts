import { api, readJson } from "@/server/http";
import { UpdateCaseSchema, deleteCase, getCase, updateCase } from "@/server/services/cases";

type P = { id: string };

export const GET = api<P>({ permission: "case.read" }, (_req, auth, { id }) => getCase(auth, id));

export const PATCH = api<P>({ permission: "case.contribute" }, async (req, auth, { id }) =>
  updateCase(auth, id, UpdateCaseSchema.parse(await readJson(req))),
);

export const DELETE = api<P>({ permission: "case.delete" }, async (_req, auth, { id }) => {
  await deleteCase(auth, id);
  return { deleted: true };
});
