import { api } from "@/server/http";
import { getScreenshot, removeScreenshot } from "@/server/services/comms";

export const GET = api<{ id: string; sid: string }>({ rpm: 240 }, (_req, auth, { id, sid }) => getScreenshot(auth, id, sid));

export const DELETE = api<{ id: string; sid: string }>({ permission: "case.contribute", rpm: 30 }, (_req, auth, { id, sid }) => removeScreenshot(auth, id, sid));
