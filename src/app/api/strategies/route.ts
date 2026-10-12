import { api, readJson } from "@/server/http";
import { listCases, withDerived } from "@/server/services/cases";
import { CreateStrategySchema, createStrategy } from "@/server/services/strategy";

export const GET = api({ permission: "case.read" }, async (req, auth) => ({
  strategies: await listCases(auth, req.nextUrl.searchParams.get("filter") ?? undefined, "strategy"),
}));

export const POST = api({ permission: "case.manage", rpm: 20 }, async (req, auth) =>
  withDerived(await createStrategy(auth, CreateStrategySchema.parse(await readJson(req)))),
);
