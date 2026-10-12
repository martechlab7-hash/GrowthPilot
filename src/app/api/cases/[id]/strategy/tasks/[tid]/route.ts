import { api, readJson } from "@/server/http";
import { TaskUpdateSchema, updateTask } from "@/server/services/strategy";

export const PATCH = api<{ id: string; tid: string }>({ permission: "case.contribute", rpm: 60 }, async (req, auth, { id, tid }) => updateTask(auth, id, tid, TaskUpdateSchema.parse(await readJson(req))));
