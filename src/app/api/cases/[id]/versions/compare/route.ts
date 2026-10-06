import { api, badRequest } from "@/server/http";
import { compareVersions } from "@/server/services/cases";

export const GET = api<{ id: string }>({ permission: "case.read" }, (req, auth, { id }) => {
  const a = req.nextUrl.searchParams.get("a");
  const b = req.nextUrl.searchParams.get("b");
  if (!a || !b) throw badRequest("Provide version ids a and b");
  return compareVersions(auth, id, a, b);
});
