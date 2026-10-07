import { NextResponse } from "next/server";
import { api, badRequest } from "@/server/http";
import { notFound } from "@/server/errors";
import { getCase } from "@/server/services/cases";
import { audit } from "@/server/services/org";
import { journeySpec, specToCsv, specToMarkdown } from "@/reports/journeyExport";

/** Build spec for one activation journey: ?format=json|md|csv */
export const GET = api<{ id: string; jid: string }>({ permission: "case.read", rpm: 30 }, async (req, auth, { id, jid }) => {
  const format = req.nextUrl.searchParams.get("format") ?? "md";
  if (!["json", "md", "csv"].includes(format)) throw badRequest("format must be json, md or csv");
  const { case: c } = await getCase(auth, id);
  const j = c.journeys.find((x) => x.id === jid);
  if (!j) throw notFound("Journey");
  const spec = journeySpec(c, j);
  const body = format === "json" ? JSON.stringify(spec, null, 2) : format === "csv" ? specToCsv(spec) : specToMarkdown(spec);
  const slug = j.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "journey";
  await audit(auth.orgId, auth.uid, "journey.export", id, { journey: jid, format });
  return new NextResponse(body, {
    headers: {
      "content-type": format === "json" ? "application/json" : format === "csv" ? "text/csv; charset=utf-8" : "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-build-spec.${format}"`,
      "cache-control": "private, no-store",
    },
  });
});
