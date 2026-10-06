import { api, readJson } from "@/server/http";
import { economicsDefaults, getCase, saveEconomics } from "@/server/services/cases";

type P = { id: string };

export const GET = api<P>({ permission: "case.read" }, async (_req, auth, { id }) => {
  const { case: c } = await getCase(auth, id);
  return { defaults: economicsDefaults(c), economics: c.economics ?? null };
});

export const PUT = api<P>({ permission: "case.contribute" }, async (req, auth, { id }) =>
  saveEconomics(auth, id, await readJson(req)),
);
