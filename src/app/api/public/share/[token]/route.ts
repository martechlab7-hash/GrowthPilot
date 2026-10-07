import { NextResponse, type NextRequest } from "next/server";
import { sharedCase } from "@/server/services/cases";
import { getBrand } from "@/server/services/brands";
import { buildReportModel, forAudience, AUDIENCES, type Audience } from "@/reports/model";
import { rateLimit } from "@/server/rateLimit";
import { log } from "@/server/logger";

/**
 * Public, read-only report for holders of a share link. Only the report
 * model (the same content as the exports) is returned, never the case.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`share:${ip}`, 60, 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  try {
    const { token } = await ctx.params;
    const c = await sharedCase(token);
    if (!c || !c.recommendations.length) return NextResponse.json({ error: "This link is invalid or has been revoked." }, { status: 404 });
    const audience = (c.share?.audience && c.share.audience in AUDIENCES ? c.share.audience : "executive") as Audience;
    const model = forAudience(buildReportModel(c, await getBrand(c.organizationId, c.brandId)), audience);
    return NextResponse.json({ model }, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
  } catch (err) {
    log("error", "share.read_failed", { message: (err as Error).message });
    return NextResponse.json({ error: "The report could not be loaded." }, { status: 500 });
  }
}
