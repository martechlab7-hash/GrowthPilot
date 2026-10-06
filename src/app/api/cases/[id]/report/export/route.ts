import { NextResponse } from "next/server";
import { api, badRequest } from "@/server/http";
import { getCase } from "@/server/services/cases";
import { audit, getBrand } from "@/server/services/org";
import { BrandProfileSchema, DEFAULT_BRAND } from "@/domain/types";
import { EXPORT_FORMATS, renderReport, type ExportFormat } from "@/reports/render";

export const maxDuration = 120;

/** ?format=pdf|docx|pptx|md|json&brand=saved|default */
export const GET = api<{ id: string }>({ permission: "case.read", rpm: 20 }, async (req, auth, { id }) => {
  const format = req.nextUrl.searchParams.get("format") as ExportFormat | null;
  if (!format || !EXPORT_FORMATS.includes(format)) throw badRequest(`format must be one of ${EXPORT_FORMATS.join(", ")}`);
  const { case: c } = await getCase(auth, id);
  const brand = req.nextUrl.searchParams.get("brand") === "default" ? DEFAULT_BRAND : BrandProfileSchema.parse(await getBrand(auth.orgId));
  const { body, mime, filename } = await renderReport(c, brand, format);
  await audit(auth.orgId, auth.uid, "report.export", id, { format });
  return new NextResponse(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
});
