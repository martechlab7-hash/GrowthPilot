import { api, readJson } from "@/server/http";
import { KpiUpdateSchema, updateKpi } from "@/server/services/strategy";

export const PATCH = api<{ id: string; kid: string }>({ permission: "case.contribute", rpm: 60 }, async (req, auth, { id, kid }) => updateKpi(auth, id, kid, KpiUpdateSchema.parse(await readJson(req))));
