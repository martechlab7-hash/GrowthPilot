import "server-only";
import { z } from "zod";
import type { AuthContext } from "../auth";
import { badRequest, forbidden, notFound } from "../errors";
import { can } from "../permissions";
import { getStore } from "../store";
import { audit } from "./org";

/**
 * Benchmarks the organisation has sourced itself. Every entry needs a source
 * link: the platform never ships unsourced numbers, and agents must cite the
 * source and keep benchmarks separate from the client's own data.
 */
export interface Benchmark {
  id: string;
  organizationId: string;
  metric: string;
  value: string;
  industry?: string;
  region?: string;
  period?: string;
  sourceTitle: string;
  sourceUrl: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export const BenchmarkInputSchema = z.object({
  metric: z.string().trim().min(2).max(120),
  value: z.string().trim().min(1).max(60),
  industry: z.string().trim().max(60).optional(),
  region: z.string().trim().max(60).optional(),
  period: z.string().trim().max(30).optional(),
  sourceTitle: z.string().trim().min(2).max(160),
  sourceUrl: z.string().trim().max(2000).url().refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed"),
  notes: z.string().trim().max(500).optional(),
});

const col = () => getStore().collection<Benchmark>("knowledge_benchmarks");

export async function listBenchmarks(orgId: string): Promise<Benchmark[]> {
  return (await col().query({ where: [["organizationId", "==", orgId]] })).sort((a, b) => a.metric.localeCompare(b.metric));
}

export async function addBenchmark(auth: AuthContext, input: z.infer<typeof BenchmarkInputSchema>) {
  if ((await listBenchmarks(auth.orgId)).length >= 300) throw badRequest("The benchmark library holds up to 300 entries.");
  const doc: Benchmark = {
    id: `bm_${crypto.randomUUID().slice(0, 12)}`,
    organizationId: auth.orgId,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== "")),
    createdBy: auth.uid,
    createdAt: new Date().toISOString(),
  } as Benchmark;
  await col().set(doc);
  await audit(auth.orgId, auth.uid, "knowledge.benchmark.add", doc.id);
  return doc;
}

export async function deleteBenchmark(auth: AuthContext, id: string) {
  const doc = await col().get(id);
  if (!doc || doc.organizationId !== auth.orgId) throw notFound("Benchmark");
  if (doc.createdBy !== auth.uid && !(auth.profile && can(auth.profile.role, "case.manage"))) throw forbidden("Only the person who added this benchmark or a strategist can remove it.");
  await col().delete(id);
  await audit(auth.orgId, auth.uid, "knowledge.benchmark.delete", id);
}

/** Benchmarks relevant to a case's industry, as labelled external references for the agents. */
export async function benchmarksForAgents(orgId: string, industryName?: string): Promise<string | undefined> {
  const rows = (await listBenchmarks(orgId)).filter((b) => !b.industry || !industryName || b.industry.toLowerCase().includes(industryName.toLowerCase().slice(0, 5)) || industryName.toLowerCase().includes(b.industry.toLowerCase().slice(0, 5)));
  if (!rows.length) return undefined;
  return rows.slice(0, 25).map((b) => `- ${b.metric}: ${b.value}${b.industry ? ` (${b.industry}${b.region ? `, ${b.region}` : ""})` : ""}${b.period ? `, ${b.period}` : ""}. Source: ${b.sourceTitle} <${b.sourceUrl}>${b.notes ? ` — ${b.notes}` : ""}`).join("\n");
}
