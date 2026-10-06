import { api, readJson } from "@/server/http";
import { deepenInterview, getInterview } from "@/server/services/cases";

type P = { id: string };

/** Next highest-information-value questions, sufficiency and readiness. */
export const GET = api<P>({ permission: "case.read" }, (_req, auth, { id }) => getInterview(auth, id));

/** { adaptive: true } asks the Interview Agent for deeper follow-ups. */
export const POST = api<P>({ permission: "case.contribute", rpm: 20 }, async (req, auth, { id }) => {
  const body = await readJson<{ adaptive?: boolean }>(req).catch(() => ({ adaptive: false }));
  return body.adaptive ? deepenInterview(auth, id) : getInterview(auth, id);
});
