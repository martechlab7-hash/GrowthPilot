import { api } from "@/server/http";
import { deleteResource } from "@/server/services/resources";

export const DELETE = api<{ id: string }>({ permission: "case.contribute", rpm: 30 }, async (_req, auth, { id }) => {
  await deleteResource(auth, id);
  return { deleted: true };
});
