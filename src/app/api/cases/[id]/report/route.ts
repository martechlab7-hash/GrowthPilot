import { api } from "@/server/http";
import { generateReport, getCase } from "@/server/services/cases";
import { getBrand } from "@/server/services/brands";
import { buildReportModel } from "@/reports/model";
import { DEFAULT_BRAND } from "@/domain/types";

type P = { id: string };

export const maxDuration = 300;

/** The web report model (identical content to all exports). */
/** ?brand=<brandId>|default previews another saved brand or the plain style; otherwise the case's brand. */
export const GET = api<P>({ permission: "case.read" }, async (req, auth, { id }) => {
  const { case: c } = await getCase(auth, id);
  const requested = req.nextUrl.searchParams.get("brand");
  const brand = requested === "default" ? DEFAULT_BRAND : await getBrand(auth.orgId, requested || c.brandId);
  return { model: buildReportModel(c, brand), hasNarrative: !!c.report };
});

export const POST = api<P>({ permission: "case.manage", rpm: 6 }, (_req, auth, { id }) => generateReport(auth, id));
