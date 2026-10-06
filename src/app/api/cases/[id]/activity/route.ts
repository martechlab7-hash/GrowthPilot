import { api } from "@/server/http";
import { getCase } from "@/server/services/cases";
import { getActivity } from "@/server/services/activity";

/** Live progress of the AI operation on this case (polled by the UI). */
export const GET = api<{ id: string }>({ permission: "case.read", rpm: 600 }, async (_req, auth, { id }) => {
  await getCase(auth, id); // tenant check
  return { activity: await getActivity(auth.orgId, id) };
});
