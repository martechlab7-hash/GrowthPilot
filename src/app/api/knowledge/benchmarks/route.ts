import { api, readJson } from "@/server/http";
import { BenchmarkInputSchema, addBenchmark, listBenchmarks } from "@/server/services/benchmarks";

export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ benchmarks: await listBenchmarks(auth.orgId) }));

export const POST = api({ permission: "case.contribute", rpm: 30 }, async (req, auth) => ({
  benchmark: await addBenchmark(auth, BenchmarkInputSchema.parse(await readJson(req))),
}));
