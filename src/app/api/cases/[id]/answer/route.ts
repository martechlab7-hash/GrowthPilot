import { api, readJson } from "@/server/http";
import { AnswerSchema, answerQuestions } from "@/server/services/cases";

export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 60 }, async (req, auth, { id }) =>
  answerQuestions(auth, id, AnswerSchema.parse(await readJson(req))),
);
