import { api, readJson } from "@/server/http";
import { CommentInputSchema, addComment } from "@/server/services/cases";

export const POST = api<{ id: string }>({ permission: "case.read", rpm: 60 }, async (req, auth, { id }) =>
  addComment(auth, id, CommentInputSchema.parse(await readJson(req))),
);
