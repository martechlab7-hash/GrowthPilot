import { api } from "@/server/http";
import { getCase } from "@/server/services/cases";
import { similarCases } from "@/server/services/memory";

/** Past cases in this organisation that look like this one. */
export const GET = api<{ id: string }>({ permission: "case.read" }, async (_req, auth, { id }) => {
  const { case: c } = await getCase(auth, id);
  return { similar: await similarCases(auth.orgId, c) };
});
