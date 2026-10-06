import { api, readJson } from "@/server/http";
import { diagnose } from "@/server/services/cases";

export const maxDuration = 300;

export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, async (req, auth, { id }) => {
  const body = await readJson<{ override?: boolean }>(req).catch(() => ({ override: false }));
  return diagnose(auth, id, body.override === true);
});
