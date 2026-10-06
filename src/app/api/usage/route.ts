import { api } from "@/server/http";
import { usageSummary } from "@/server/services/usage";

export const GET = api({ permission: "org.manage" }, async (req, auth) => {
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
  return usageSummary(auth.orgId, days);
});
