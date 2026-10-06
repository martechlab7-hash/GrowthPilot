import { api } from "@/server/http";
import { generateReport, getCase } from "@/server/services/cases";
import { getBrand } from "@/server/services/org";
import { buildReportModel } from "@/reports/model";

type P = { id: string };

export const maxDuration = 300;

/** The web report model (identical content to all exports). */
export const GET = api<P>({ permission: "case.read" }, async (_req, auth, { id }) => {
  const { case: c } = await getCase(auth, id);
  return { model: buildReportModel(c, await getBrand(auth.orgId)), hasNarrative: !!c.report };
});

export const POST = api<P>({ permission: "case.manage", rpm: 6 }, (_req, auth, { id }) => generateReport(auth, id));
