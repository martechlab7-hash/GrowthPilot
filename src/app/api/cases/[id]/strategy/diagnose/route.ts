import { api } from "@/server/http";
import { diagnose } from "@/server/services/strategy";

export const maxDuration = 300;

export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 6 }, (_req, auth, { id }) => diagnose(auth, id));
