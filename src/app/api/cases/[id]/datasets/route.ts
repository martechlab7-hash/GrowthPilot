import { api, readJson } from "@/server/http";
import { DatasetInputSchema, addDataset } from "@/server/services/cases";

export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 20 }, async (req, auth, { id }) =>
  addDataset(auth, id, DatasetInputSchema.parse(await readJson(req))),
);
