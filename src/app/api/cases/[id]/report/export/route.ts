import { NextResponse } from "next/server";
import { api, badRequest } from "@/server/http";
import { getCase } from "@/server/services/cases";
import { audit, getBrand } from "@/server/services/org";
import { BrandProfileSchema, DEFAULT_BRAND } from "@/domain/types";
import { EXPORT_FORMATS, renderReport, type ExportFormat } from "@/reports/render";
import { AUDIENCES, type Audience } from "@/reports/model";

export const maxDuration = 120;

/** ?format=pdf|docx|pptx|md|json&brand=saved|default&audience=full|executive|crm|data */
export const GET = api<{ id: string }>({ permission: "case.read", rpm: 20 }, async (req, auth, { id }) => {
  const format = req.nextUrl.searchParams.get("format") as ExportFormat | null;
  if (!format || !EXPORT_FORMATS.includes(format)) throw badRequest(`format must be one of ${EXPORT_FORMATS.join(", ")}`);
  const { case: c } = await getCase(auth, id);
  const brand = req.nextUrl.searchParams.get("brand") === "default" ? DEFAULT_BRAND : BrandProfileSchema.parse(await getBrand(auth.orgId));
  const a = req.nextUrl.searchParams.get("audience") ?? "full";
  const audience: Audience = a in AUDIENCES ? (a as Audience) : "full";
  const { body, mime, filename } = await renderReport(c, brand, format, audience);
  await audit(auth.orgId, auth.uid, "report.export", id, { format, audience });
  return new NextResponse(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
});
