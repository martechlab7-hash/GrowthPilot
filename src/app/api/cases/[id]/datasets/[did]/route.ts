import { api } from "@/server/http";
import { removeDataset } from "@/server/services/cases";

export const DELETE = api<{ id: string; did: string }>({ permission: "case.contribute", rpm: 30 }, (_req, auth, { id, did }) => removeDataset(auth, id, did));
