import { api } from "@/server/http";
import { trackRecord } from "@/server/services/memory";

/** How past initiatives performed against their forecasts. */
export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ trackRecord: await trackRecord(auth.orgId) }));
