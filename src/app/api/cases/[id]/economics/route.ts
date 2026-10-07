import { api, readJson } from "@/server/http";
import { economicsDefaults, getCase, saveEconomics } from "@/server/services/cases";

type P = { id: string };

/** Defaults for the case's best-fit business-case template, or for ?model=<id> when the user switches. */
export const GET = api<P>({ permission: "case.read" }, async (req, auth, { id }) => {
  const { case: c } = await getCase(auth, id);
  return { defaults: economicsDefaults(c, req.nextUrl.searchParams.get("model") ?? undefined), economics: c.economics ?? null };
});

export const PUT = api<P>({ permission: "case.contribute" }, async (req, auth, { id }) =>
  saveEconomics(auth, id, await readJson(req)),
);
