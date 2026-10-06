import { api } from "@/server/http";
import { listHistory } from "@/server/services/cases";

export const GET = api<{ id: string }>({ permission: "case.read" }, (_req, auth, { id }) => listHistory(auth, id));
