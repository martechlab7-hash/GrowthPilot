import { api } from "@/server/http";
import { deleteBenchmark } from "@/server/services/benchmarks";

export const DELETE = api<{ id: string }>({ permission: "case.contribute", rpm: 30 }, async (_req, auth, { id }) => {
  await deleteBenchmark(auth, id);
  return { deleted: true };
});
