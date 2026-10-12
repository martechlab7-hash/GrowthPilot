import { api, readJson } from "@/server/http";
import { SettingsUpdateSchema, updateSettings } from "@/server/services/strategy";

export const PATCH = api<{ id: string }>({ permission: "case.manage", rpm: 30 }, async (req, auth, { id }) => updateSettings(auth, id, SettingsUpdateSchema.parse(await readJson(req))));
