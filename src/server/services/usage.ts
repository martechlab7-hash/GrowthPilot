import "server-only";
import type { UsageRecord } from "@/ai/types";
import type { Plan } from "@/domain/types";
import { HttpError } from "../errors";
import { getStore } from "../store";

type UsageRow = UsageRecord & { id: string };
interface Counter {
  id: string;
  organizationId: string;
  day: string;
  requests: number;
}

/**
 * Plan limits (spec §78). These are GrowthPilot's own guard rails, separate
 * from the AI provider's quotas: workspaces bring their own API keys and pay
 * the provider directly, so the daily cap mainly protects against runaway
 * usage. A deployment can override them with environment variables:
 *   AI_DAILY_REQUEST_LIMIT  answered AI requests per workspace per day (0 = unlimited)
 *   MAX_ACTIVE_CASES        open cases per workspace (0 = unlimited)
 */
const PLAN_DEFAULTS: Record<Plan, { activeCases: number; aiRequestsPerDay: number }> = {
  free: { activeCases: 3, aiRequestsPerDay: 500 },
  professional: { activeCases: 50, aiRequestsPerDay: 600 },
  business: { activeCases: 500, aiRequestsPerDay: 3000 },
  enterprise: { activeCases: 100_000, aiRequestsPerDay: 100_000 },
};

function override(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n === 0 ? Number.POSITIVE_INFINITY : Math.floor(n);
}

/** Effective limits for a plan, after deployment overrides. */
export function planLimits(plan: Plan): { activeCases: number; aiRequestsPerDay: number } {
  const base = PLAN_DEFAULTS[plan];
  return {
    activeCases: override("MAX_ACTIVE_CASES") ?? base.activeCases,
    aiRequestsPerDay: override("AI_DAILY_REQUEST_LIMIT") ?? base.aiRequestsPerDay,
  };
}

/** @deprecated use planLimits(plan), which applies deployment overrides. */
export const PLAN_LIMITS = PLAN_DEFAULTS;

const today = () => new Date().toISOString().slice(0, 10);

export async function recordUsage(u: UsageRecord) {
  const store = getStore();
  await store.collection<UsageRow>("ai_usage").set({ id: `use_${crypto.randomUUID()}`, ...u });
  // Only answered requests count toward the plan's daily allowance: a rejected
  // or timed-out attempt (quota, bad key, outage) produced nothing for the user.
  if (!u.success) return;
  const day = u.createdAt.slice(0, 10);
  const id = `${u.organizationId}_${day}`;
  await store.collection<Counter>("usage_counters").transact(id, (cur) => ({
    id,
    organizationId: u.organizationId,
    day,
    requests: (cur?.requests ?? 0) + 1,
  }));
}

export async function assertAiQuota(orgId: string, plan: Plan) {
  const counter = await getStore().collection<Counter>("usage_counters").get(`${orgId}_${today()}`);
  const limit = planLimits(plan).aiRequestsPerDay;
  if (Number.isFinite(limit) && (counter?.requests ?? 0) >= limit) {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    const hours = Math.max(1, Math.ceil((midnight.getTime() - Date.now()) / 3_600_000));
    throw new HttpError(
      429,
      `Your workspace has used all ${limit} AI requests included in the ${plan} plan today. The allowance resets at 00:00 UTC (in about ${hours} hour${hours === 1 ? "" : "s"}). See Settings → AI usage for what used them. Your case is saved.`,
      "AI_QUOTA",
    );
  }
}

export async function usageSummary(orgId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await getStore()
    .collection<UsageRow>("ai_usage")
    .query({ where: [["organizationId", "==", orgId], ["createdAt", ">=", since]], orderBy: { field: "createdAt", direction: "desc" }, limit: 5000 });
  const byModel = new Map<string, { requests: number; inputTokens: number; outputTokens: number; costUsd: number; failures: number }>();
  const byAgent = new Map<string, number>();
  let latencyTotal = 0;
  for (const r of rows) {
    const k = `${r.provider}:${r.model}`;
    const m = byModel.get(k) ?? { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, failures: 0 };
    m.requests++;
    m.inputTokens += r.inputTokens;
    m.outputTokens += r.outputTokens;
    m.costUsd += r.costUsd ?? 0;
    if (!r.success) m.failures++;
    byModel.set(k, m);
    byAgent.set(r.agent, (byAgent.get(r.agent) ?? 0) + 1);
    latencyTotal += r.latencyMs;
  }
  return {
    days,
    requests: rows.length,
    failures: rows.filter((r) => !r.success).length,
    inputTokens: rows.reduce((s, r) => s + r.inputTokens, 0),
    outputTokens: rows.reduce((s, r) => s + r.outputTokens, 0),
    costUsd: Math.round(rows.reduce((s, r) => s + (r.costUsd ?? 0), 0) * 10000) / 10000,
    costTracked: rows.some((r) => r.costUsd !== null),
    avgLatencyMs: rows.length ? Math.round(latencyTotal / rows.length) : 0,
    byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })),
    byAgent: [...byAgent.entries()].map(([agent, requests]) => ({ agent, requests })),
  };
}
