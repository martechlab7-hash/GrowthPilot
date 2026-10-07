import { api } from "@/server/http";
import { deleteComment } from "@/server/services/cases";

export const DELETE = api<{ id: string; cid: string }>({ permission: "case.read", rpm: 60 }, (_req, auth, { id, cid }) => deleteComment(auth, id, cid));
