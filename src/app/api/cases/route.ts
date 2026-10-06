import { api, readJson } from "@/server/http";
import { CreateCaseSchema, createCase, listCases, withDerived } from "@/server/services/cases";

export const GET = api({ permission: "case.read" }, async (req, auth) => ({
  cases: await listCases(auth, req.nextUrl.searchParams.get("filter") ?? undefined),
}));

export const POST = api({ permission: "case.manage", rpm: 20 }, async (req, auth) =>
  withDerived(await createCase(auth, CreateCaseSchema.parse(await readJson(req)))),
);
