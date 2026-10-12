import "server-only";
import { z } from "zod";
import * as sa from "@/ai/agents/strategy";
import {
  PACES,
  StrategySettingsSchema,
  type Case,
  type FieldValue,
  type StrategyPlan,
  type StrategyRecommendation,
} from "@/domain/types";
import { CHANNEL_KEY, CHANNEL_OPTIONS } from "@/engine/caseProfile";
import { rankRecommendations } from "@/engine/strategy/priority";
import { describePage, readPage } from "@/lib/web/page";
import type { AuthContext } from "../auth";
import { inBackground } from "../background";
import { badRequest, notFound } from "../errors";
import { log } from "../logger";
import { fetchPublicPage } from "../safeFetch";
import { createCase, loadCase, mutate, snapshot, withAi, withDerived, entry } from "./cases";
import { audit } from "./org";
import { secondOpinion } from "./providers";
import { getActivity } from "./activity";

const now = () => new Date().toISOString();
const rid = (p: string) => `${p}_${crypto.randomUUID().slice(0, 8)}`;

export const TYPE_NAMES: Record<StrategyPlan["settings"]["type"], string> = {
  existing: "Improve my existing marketing strategy",
  gtm: "Build a new go-to-market strategy",
  launch: "Launch a new product or service",
  growth_problem: "Solve a specific growth problem",
  retention: "Improve retention, loyalty or win-back",
  full: "Build a complete marketing strategy from scratch",
};

export const CreateStrategySchema = z.object({
  name: z.string().trim().min(3).max(200),
  brief: z.string().trim().min(20, "Describe the business and what you want in at least a sentence").max(10_000),
  industry: z.string().max(80).optional(),
  currency: z.string().length(3).default("USD"),
  salesChannel: z.enum(["offline", "online", "omni"]).optional(),
  settings: StrategySettingsSchema,
});

export async function createStrategy(auth: AuthContext, input: z.infer<typeof CreateStrategySchema>): Promise<Case> {
  const s = input.settings;
  const facts: [string, FieldValue][] = [
    ["business.strategy_type", TYPE_NAMES[s.type]],
    ["business.strategy_scope", { end_to_end: "End-to-end marketing strategy", digital: "Digital marketing only", crm: "CRM, retention and lifecycle", paid: "Paid acquisition and advertising", launch: "Product launch and GTM" }[s.scope]],
    ["business.execution_pace", s.pace],
    ["business.planning_horizon", s.horizon],
    ["business.execution_resources", s.resources],
  ];
  if (s.launchDate) facts.push(["business.target_launch_date", s.launchDate]);
  if (input.salesChannel) facts.push([CHANNEL_KEY, CHANNEL_OPTIONS[input.salesChannel]]);
  if (s.competitors.length) facts.push(["competition.names", s.competitors.map((c) => c.name).join(", ")]);
  const strategy: StrategyPlan = {
    settings: s, status: "draft", segments: [], pillars: [], recommendations: [], channelPlan: [], lifecycle: [],
    budget: [], tasks: [], kpis: [], experiments: [], risks: [], first30Days: [], openQuestions: [], measurementReadiness: [],
  };
  const c = await createCase(auth, { name: input.name, problemStatement: input.brief, currency: input.currency, ...(input.industry ? { industry: input.industry } : {}) }, {
    strategy,
    facts,
    welcome:
      `Let's build this strategy properly. I'll interview you like a strategy consultant: the essentials first, then follow-ups where an answer opens a question. ` +
      `Skip anything you can't answer and I'll plan how to find it out. Once I understand the business, I'll diagnose it, then build the strategy, put it in front of the devil's-advocate panel, and turn it into a roadmap, budget and KPIs.`,
  });
  await audit(auth.orgId, auth.uid, "strategy.create", c.id, { type: s.type });
  return c;
}

async function loadStrategy(auth: AuthContext, id: string): Promise<Case & { strategy: StrategyPlan }> {
  const c = await loadCase(auth, id);
  if (c.kind !== "strategy" || !c.strategy) throw notFound("Strategy");
  return c as Case & { strategy: StrategyPlan };
}

function patch(auth: AuthContext, id: string, fn: (s: StrategyPlan, c: Case) => StrategyPlan, extra?: (c: Case) => Partial<Case>) {
  return mutate(auth, id, (c) => ({ ...c, ...(extra ? extra(c) : {}), strategy: fn(c.strategy!, c) }));
}

/* -------------------------------- Diagnosis -------------------------------- */

export async function diagnose(auth: AuthContext, id: string) {
  const c = await loadStrategy(auth, id);
  const out = await withAi(auth, c, "strategy_diagnosis", (deps) => sa.diagnoseStrategy(deps, c));
  const updated = await patch(auth, id, (s) => ({ ...s, diagnosis: { ...out, at: now() } }), (cur) => ({
    transcript: [...cur.transcript, entry("consultant", "message", `Diagnosis ready: ${out.summary}`)].slice(-400),
  }));
  return withDerived(updated);
}

/* --------------------------------- Build ----------------------------------- */

export async function build(auth: AuthContext, id: string) {
  let c = await loadStrategy(auth, id);
  if (!c.strategy.diagnosis) {
    await diagnose(auth, id);
    c = await loadStrategy(auth, id);
  }
  const out = await withAi(auth, c, "strategy_build", (deps) => sa.buildStrategy(deps, c));
  const pillarIds = new Set(out.pillars.map((p) => p.id));
  const kept = c.strategy.recommendations.filter((r) => r.status === "rejected");
  const recs = rankRecommendations([
    ...kept,
    ...out.recommendations.map((r): StrategyRecommendation => ({
      ...r,
      id: rid("rec"),
      pillarId: pillarIds.has(r.pillarId) ? r.pillarId : out.pillars[0]!.id,
      priority: 0, rank: 0, quickWin: false, status: "proposed",
    })),
  ]);
  const updated = await patch(auth, id, (s) => ({
    ...s,
    status: "generated",
    executive: out.executive,
    segments: out.segments,
    pillars: out.pillars,
    recommendations: recs,
    channelPlan: out.channelPlan,
    messaging: out.messaging,
    ...(out.gtm ? { gtm: out.gtm } : {}),
    lifecycle: out.lifecycle,
    measurementReadiness: out.measurementReadiness,
    openQuestions: out.openQuestions,
    debateStatus: "pending",
    generatedAt: now(),
  }));
  await snapshot(auth, updated, "Strategy generated");
  // The panel debates in the background so the strategy appears straight away.
  await inBackground("strategy.debate", () => runDebate(auth, id));
  return withDerived(await loadCase(auth, id));
}

async function runDebate(auth: AuthContext, id: string) {
  const c = await loadStrategy(auth, id);
  const targets = c.strategy.recommendations.filter((r) => r.status !== "rejected");
  if (!targets.length) return;
  // A different provider argues the other side, so the panel doesn't share the author's blind spots.
  const debater = auth.aiPreference ? auth : { ...auth, ...(await secondOpinion(auth.orgId).then((p) => (p ? { aiPreference: p } : {}))) };
  try {
    const debates = await withAi(debater, c, "strategy_debate", (deps) => sa.debateStrategy(deps, c, targets), { flagPending: false });
    const model = (await getActivity(auth.orgId, id))?.model;
    await patch(auth, id, (s) => ({
      ...s,
      debateStatus: "done",
      recommendations: s.recommendations.map((r) => (debates[r.id] ? { ...r, debate: { ...debates[r.id]!, at: now(), ...(model ? { model } : {}) } } : r)),
    }));
  } catch (err) {
    log("warn", "strategy.debate_failed", { id, message: (err as Error).message });
    await patch(auth, id, (s) => ({ ...s, debateStatus: "failed" }));
    throw err;
  }
}

export async function debate(auth: AuthContext, id: string) {
  await patch(auth, id, (s) => ({ ...s, debateStatus: "pending" }));
  await runDebate(auth, id);
  return withDerived(await loadCase(auth, id));
}

export const ReviewSchema = z.object({ action: z.enum(["approve", "reject", "reset"]), feedback: z.string().trim().max(2000).optional() });

export async function reviewRecommendation(auth: AuthContext, id: string, recId: string, input: z.infer<typeof ReviewSchema>) {
  const c = await loadStrategy(auth, id);
  if (!c.strategy.recommendations.some((r) => r.id === recId)) throw notFound("Recommendation");
  if (input.action === "reject" && !input.feedback) throw badRequest("Tell me why, so the next version doesn't repeat it.");
  const updated = await patch(auth, id, (s) => ({
    ...s,
    status: s.status === "approved" ? "generated" : s.status,
    recommendations: rankRecommendations(s.recommendations.map((r) =>
      r.id !== recId ? r : { ...r, status: input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "proposed", ...(input.feedback ? { feedback: input.feedback } : {}) },
    )),
  }));
  return withDerived(updated);
}

/* ------------------------- Roadmap, budget and KPIs ------------------------ */

export async function plan(auth: AuthContext, id: string) {
  const c = await loadStrategy(auth, id);
  const approved = c.strategy.recommendations.filter((r) => r.status === "approved");
  const recs = approved.length ? approved : c.strategy.recommendations.filter((r) => r.status !== "rejected");
  if (!recs.length) throw badRequest("Build the strategy first, then approve the recommendations you want in the plan.");
  const out = await withAi(auth, c, "strategy_plan", (deps) => sa.planStrategy(deps, c, recs));
  const recIds = new Set(recs.map((r) => r.id));
  const taskIds = new Set(out.tasks.map((t) => t.id));
  // Keep task progress the team already recorded when the plan is rebuilt.
  const previous = new Map(c.strategy.tasks.map((t) => [t.title.toLowerCase(), t.status]));
  const updated = await patch(auth, id, (s) => ({
    ...s,
    budget: PACES.map((pace) => out.budget.find((b) => b.pace === pace)).filter((b): b is NonNullable<typeof b> => !!b),
    tasks: out.tasks.map(({ recommendationId, ...t }) => ({
      ...t,
      ...(recommendationId && recIds.has(recommendationId) ? { recommendationId } : {}),
      dependsOn: t.dependsOn.filter((d) => taskIds.has(d) && d !== t.id),
      status: previous.get(t.title.toLowerCase()) ?? "todo",
    })),
    kpis: out.kpis.map((k) => ({ ...k, id: rid("kpi"), status: "not_started" as const })),
    experiments: out.experiments,
    risks: out.risks,
    first30Days: out.first30Days,
  }));
  return withDerived(updated);
}

export const TaskUpdateSchema = z.object({ status: z.enum(["todo", "doing", "done", "blocked"]).optional(), owner: z.string().trim().min(1).max(80).optional() });

export async function updateTask(auth: AuthContext, id: string, taskId: string, input: z.infer<typeof TaskUpdateSchema>) {
  const c = await loadStrategy(auth, id);
  if (!c.strategy.tasks.some((t) => t.id === taskId)) throw notFound("Task");
  return withDerived(await patch(auth, id, (s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...input } : t)) })));
}

export const KpiUpdateSchema = z.object({
  actual: z.string().trim().max(120).optional(),
  target: z.string().trim().max(120).optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track"]).optional(),
  correctiveAction: z.string().trim().max(1000).optional(),
});

export async function updateKpi(auth: AuthContext, id: string, kpiId: string, input: z.infer<typeof KpiUpdateSchema>) {
  const c = await loadStrategy(auth, id);
  if (!c.strategy.kpis.some((k) => k.id === kpiId)) throw notFound("KPI");
  if ((input.status === "off_track" || input.status === "at_risk") && !input.correctiveAction && !c.strategy.kpis.find((k) => k.id === kpiId)!.correctiveAction) {
    throw badRequest("Add the corrective action for a KPI that is off track or at risk.");
  }
  return withDerived(await patch(auth, id, (s) => ({ ...s, kpis: s.kpis.map((k) => (k.id === kpiId ? { ...k, ...input } : k)) })));
}

export const SettingsUpdateSchema = StrategySettingsSchema.pick({ pace: true, horizon: true, resources: true, launchDate: true, competitor: true }).partial().extend({ launchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() });

export async function updateSettings(auth: AuthContext, id: string, input: z.infer<typeof SettingsUpdateSchema>) {
  await loadStrategy(auth, id);
  return withDerived(await patch(auth, id, (s) => {
    const { launchDate, ...rest } = input;
    const settings = { ...s.settings, ...rest };
    if (launchDate === null) delete settings.launchDate;
    else if (launchDate) settings.launchDate = launchDate;
    return { ...s, settings };
  }));
}

/* ---------------------------- Competitor research -------------------------- */

export const CompetitorsSchema = z.object({ competitors: StrategySettingsSchema.shape.competitors, researchQuestions: z.string().max(1000).optional() });

export async function research(auth: AuthContext, id: string, input?: z.infer<typeof CompetitorsSchema>) {
  if (input) {
    await patch(auth, id, (s) => ({ ...s, settings: { ...s.settings, competitors: input.competitors, ...(input.researchQuestions !== undefined ? { researchQuestions: input.researchQuestions } : {}) } }));
  }
  const c = await loadStrategy(auth, id);
  if (c.strategy.settings.competitor === "none") throw badRequest("Competitor research is switched off for this strategy. Turn it on first.");
  if (!c.strategy.settings.competitors.length) throw badRequest("Add at least one competitor to research.");
  const pagesRead: NonNullable<StrategyPlan["research"]>["pagesRead"] = [];
  const pages: { competitor: string; url: string; description: string }[] = [];
  await Promise.all(c.strategy.settings.competitors.filter((x) => x.url).map(async (x) => {
    try {
      const { url, html } = await fetchPublicPage(x.url!);
      const { title, ...facts } = readPage(html);
      pages.push({ competitor: x.name, url, description: describePage(url, { ...facts, ...(title ? { title } : {}) }) });
      pagesRead.push({ competitor: x.name, url, status: "read", ...(title ? { title } : {}) });
    } catch (err) {
      pagesRead.push({ competitor: x.name, url: x.url!, status: "failed", error: (err as Error).message.slice(0, 160) });
    }
  }));
  const out = await withAi(auth, c, "competitor_research", (deps) => sa.researchCompetitors(deps, c, pages));
  const compare = c.strategy.settings.competitor === "compare";
  const updated = await patch(auth, id, (s) => ({
    ...s,
    research: {
      mode: compare ? "compare" : "research",
      pagesRead,
      // Anything not traceable to a page read in code is at most a hypothesis.
      findings: out.findings.map((f) => (f.kind === "observed" && !pages.some((p) => p.competitor === f.competitor) ? { ...f, kind: "hypothesis" as const } : f)),
      comparisons: compare ? out.comparisons : [],
      implications: out.implications,
      at: now(),
    },
  }));
  return withDerived(updated);
}

/* --------------------------------- Approval -------------------------------- */

export async function approve(auth: AuthContext, id: string, note?: string) {
  const c = await loadStrategy(auth, id);
  if (!c.strategy.recommendations.some((r) => r.status === "approved")) throw badRequest("Approve at least one recommendation first.");
  if (!c.strategy.tasks.length) throw badRequest("Build the roadmap, budget and KPIs before approving the strategy.");
  const version = c.analysisVersion + 1;
  const marked = await patch(auth, id, (s) => ({ ...s, status: "approved", approval: { by: auth.uid, at: now(), version, ...(note ? { note } : {}) } }), () => ({ status: "completed" }));
  const saved = await snapshot(auth, marked, `Approved strategy v${version}`);
  await audit(auth.orgId, auth.uid, "strategy.approve", id, { version });
  return withDerived(saved);
}
