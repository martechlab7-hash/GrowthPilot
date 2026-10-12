import { z } from "zod";
import type { Case, Debate, StrategyRecommendation, StrategySettings } from "@/domain/types";
import { strategyReadiness } from "@/engine/strategy/readiness";
import { STRATEGY_CHALLENGERS } from "@/knowledge/debatePanel";
import { buildAgentContext, serializeContext } from "./context";
import { runAgent, type AgentDeps } from "./index";

/**
 * Strategy Builder agents. Each has a narrow job and a structured output;
 * prioritisation, scheduling and budget arithmetic happen in code.
 */

const STRATEGY_PERSONA = [
  "You are a senior marketing strategy consultant, growth strategist, go-to-market advisor, marketing analytics specialist and marketing technology architect.",
  "You diagnose before you recommend, and you build strategies that a real team can execute with its actual budget, people, tools and timelines.",
  "CASE CONTEXT gives sales_channel (offline / online / omni) and approach; STRATEGY SETTINGS give the strategy type, scope, competitor preference, channel preference, pace, horizon and resources. Follow them.",
].join(" ");

const STRATEGY_GUARDRAILS = `
RULES (non-negotiable):
- Use only what is in CASE CONTEXT, STRATEGY SETTINGS and the other sections. Never invent metrics, benchmarks, customer counts, competitor budgets or results.
- Label every claim's evidence: "observed" (stated by the client or in shared data), "researched" (from the RESEARCH section's public sources), "estimated" (calculated from stated assumptions; say which), "unknown" (needs input or validation).
- When a metric is missing, propose how to measure it (a baseline and instrumentation) instead of guessing or claiming underperformance.
- Be specific. Never write slogans such as "improve retention" or "leverage AI": every action names what to do, for whom, through which channel and how success is judged.
- Prefer the client's existing tools and channels; separate quick wins from new technology investments. Never recommend a channel listed in marketing.channels_excluded.
- Respect the budget ceiling (economics.monthly_budget). Never recommend more spend only because platform-reported ROAS looks good: weigh attribution quality, incrementality, margin and payback.
- Calibrate confidence (0–1). Thin evidence means low confidence.
- Text values containing tokens like [EMAIL_1] are masked personal data; keep the tokens as-is.`.trim();

const TYPE_LABELS: Record<StrategySettings["type"], string> = {
  existing: "Improve an existing marketing strategy",
  gtm: "New go-to-market strategy",
  launch: "Launch a new product or service",
  growth_problem: "Solve a specific growth problem",
  retention: "Retention, loyalty or win-back",
  full: "Complete marketing strategy from scratch",
};

export function settingsSection(s: StrategySettings): string {
  return JSON.stringify({
    strategy_type: TYPE_LABELS[s.type],
    scope: s.scope,
    competitor_research: s.competitor === "none" ? "not requested" : s.competitor === "research" ? "observable activity only, no direct comparisons" : "research and side-by-side comparison",
    channel_preference: { optimize: "optimise existing channels only", optimize_and_new: "optimise existing channels and recommend new ones", best: "evaluate the best channels, including new ones" }[s.channelPreference],
    preferred_pace: s.pace,
    planning_horizon: s.horizon,
    resources: { existing: "existing team and technology only", limited: "limited hiring, agency or technology investment", flexible: "flexible resources if the business case supports them" }[s.resources],
    ...(s.launchDate ? { target_launch_date: s.launchDate } : {}),
  });
}

function common(c: Case): Record<string, string> {
  const s = c.strategy!;
  return {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    "STRATEGY SETTINGS": settingsSection(s.settings),
    "EXECUTION READINESS (computed from answers, 0–100)": JSON.stringify(strategyReadiness(c.context).map((r) => ({ area: r.area, score: r.score, missing: r.missing }))),
  };
}

const Evidence = z.enum(["observed", "researched", "estimated", "unknown"]);

/* ------------------------------- Diagnosis -------------------------------- */

const DIAGNOSIS_SYSTEM = `${STRATEGY_PERSONA}
TASK: Diagnose the business before any strategy is written. Follow this order: business objective and baseline → the gap to the target → likely root causes and the evidence for each → what is missing to be sure.
- summary: 3–5 sentences on the situation, written for an executive.
- strengths / weaknesses: specific to this business (2–5 each).
- funnelGaps: where demand is lost (awareness, consideration, conversion, retention), stating the evidence kind in brackets.
- rootCauses: 2–5 hypotheses, each with evidenceKind, calibrated confidence and validateWith (the data or test that would confirm it).
- dataGaps: missing information that changes the strategy, why it matters, and a concrete proposal to obtain it.
- contradictions: answers that conflict with each other (empty if none).
- assumptions: what you had to assume.
${STRATEGY_GUARDRAILS}`;

export const DiagnosisOutput = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  funnelGaps: z.array(z.string()).max(6),
  rootCauses: z.array(z.object({ statement: z.string(), evidenceKind: Evidence, confidence: z.number().min(0).max(1), validateWith: z.string() })).max(6),
  dataGaps: z.array(z.object({ item: z.string(), why: z.string(), proposal: z.string() })).max(8),
  contradictions: z.array(z.string()).max(5).default([]),
  assumptions: z.array(z.string()).max(8).default([]),
});

export async function diagnoseStrategy(deps: AgentDeps, c: Case) {
  return runAgent(deps, "strategy_diagnosis", "reasoning", DIAGNOSIS_SYSTEM, common(c), DiagnosisOutput, { case: c, maxTokens: 6_000 });
}

/* ----------------------------- Strategy build ----------------------------- */

const BUILD_SYSTEM = `${STRATEGY_PERSONA}
TASK: Build the strategy from the DIAGNOSIS. Prefer a few high-value actions over a long list.
- executive: situation, strategic direction, expected outcomes (no guaranteed numbers).
- segments: 2–4 priority segments with their need, priority (primary/secondary/later) and evidenceKind.
- pillars: 3–5 strategic pillars, each tied to a measurable objective and KPI. Ids "p1", "p2", …
- recommendations: 4–8, each linked to a pillarId, with: title, problem, evidence, evidenceKind, rootCause, action (specific), rationale, audience, channels, owner (a role), timeline (phases, e.g. "Discovery 2w → set-up 3w → QA 1w → launch → optimise"), budget (incremental spend and internal effort), kpi, successCriteria (relative to the baseline), dependencies, risks, fallback (what to do if it fails), validateWith, impact/effort/risk/strategicFit (1–5), confidence (0–1), needsNewTech, and whyPrioritized (why this beats the alternatives).
- channelPlan: every relevant channel with status keep/optimize/new/test/exclude, its role, funnel stage, rationale and KPI. Respect channel_preference.
- messaging: value proposition, audience-specific propositions, 3–5 content pillars, 2–4 campaign concepts.
- gtm: ONLY for go-to-market or launch strategies (otherwise omit): positioning, target segments, offer, launch phases with goals, activities and exit criteria, sales enablement.
- lifecycle: when retention, loyalty or owned channels matter: journeys by stage (onboarding, engagement, conversion, retention, loyalty, win-back) with trigger, channels and KPI. Otherwise an empty list.
- measurementReadiness: if tracking, attribution or a source of truth is weak or unknown, the measurement workstream to do first; otherwise empty.
- openQuestions: unresolved questions and assumptions requiring validation.
${STRATEGY_GUARDRAILS}`;

const RecommendationOut = z.object({
  pillarId: z.string(),
  title: z.string(),
  problem: z.string(),
  evidence: z.string(),
  evidenceKind: Evidence,
  rootCause: z.string(),
  action: z.string(),
  rationale: z.string(),
  audience: z.string(),
  channels: z.array(z.string()).max(6),
  owner: z.string(),
  timeline: z.string(),
  budget: z.string(),
  kpi: z.string(),
  successCriteria: z.string(),
  dependencies: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(4),
  fallback: z.string(),
  validateWith: z.string(),
  impact: z.number().min(1).max(5),
  effort: z.number().min(1).max(5),
  risk: z.number().min(1).max(5),
  strategicFit: z.number().min(1).max(5),
  confidence: z.number().min(0).max(1),
  needsNewTech: z.boolean(),
  whyPrioritized: z.string(),
});

export const BuildOutput = z.object({
  executive: z.object({ situation: z.string(), direction: z.string(), outcomes: z.string() }),
  segments: z.array(z.object({ name: z.string(), need: z.string(), priority: z.enum(["primary", "secondary", "later"]), evidenceKind: Evidence })).max(5),
  pillars: z.array(z.object({ id: z.string(), title: z.string(), objective: z.string(), kpi: z.string(), rationale: z.string() })).min(1).max(5),
  recommendations: z.array(RecommendationOut).min(1).max(10),
  channelPlan: z.array(z.object({ channel: z.string(), status: z.enum(["keep", "optimize", "new", "test", "exclude"]), role: z.string(), funnelStage: z.string(), rationale: z.string(), kpi: z.string() })).max(20),
  messaging: z.object({
    valueProposition: z.string(),
    audienceValueProps: z.array(z.object({ segment: z.string(), proposition: z.string() })).max(5),
    contentPillars: z.array(z.string()).max(6),
    campaignConcepts: z.array(z.object({ name: z.string(), idea: z.string(), audience: z.string(), channels: z.array(z.string()) })).max(5),
  }),
  gtm: z.object({
    positioning: z.string(),
    targetSegments: z.array(z.string()),
    offer: z.string(),
    phases: z.array(z.object({ name: z.string(), goal: z.string(), activities: z.array(z.string()), exitCriteria: z.string() })).max(5),
    salesEnablement: z.array(z.string()),
  }).optional(),
  lifecycle: z.array(z.object({ stage: z.string(), journey: z.string(), trigger: z.string(), channels: z.array(z.string()), kpi: z.string() })).max(8).default([]),
  measurementReadiness: z.array(z.string()).max(6).default([]),
  openQuestions: z.array(z.string()).max(8).default([]),
});

export async function buildStrategy(deps: AgentDeps, c: Case) {
  const s = c.strategy!;
  return runAgent(deps, "strategy_build", "reasoning", BUILD_SYSTEM, {
    ...common(c),
    DIAGNOSIS: JSON.stringify(s.diagnosis ?? {}),
    ...(s.research ? { RESEARCH: JSON.stringify({ findings: s.research.findings, implications: s.research.implications }) } : {}),
    ...(s.recommendations.some((r) => r.status === "rejected")
      ? { "REJECTED BY THE CLIENT (do not re-propose unless new evidence)": JSON.stringify(s.recommendations.filter((r) => r.status === "rejected").map((r) => ({ title: r.title, reason: r.feedback }))) }
      : {}),
  }, BuildOutput, { case: c, maxTokens: 14_000 });
}

/* ------------------------------- Planning --------------------------------- */

const PLAN_SYSTEM = `${STRATEGY_PERSONA}
TASK: Turn the RECOMMENDATIONS into an execution plan.
- budget: exactly three scenarios: "conservative" (protect the current budget, focus on efficiency, validate before scaling), "balanced" (reallocate towards promising opportunities with controlled tests) and "aggressive" (scale faster within explicit limits, with creative capacity, tracking readiness and risk controls). Each has a one-line summary, budget lines (item, category media/technology/agency/creative/internal, oneTime and monthly amounts in the case currency, optional note), an optional forecast (metric, low/base/high, assumptions; omit it if the baseline is unknown) and scalingCriteria (conditions to meet before spending more). Stay within economics.monthly_budget for conservative and balanced. Separate media, technology, agency, creative and internal effort.
- tasks: 8–20 roadmap tasks at a sustainable pace: id ("t1", "t2", …), recommendationId (when it implements one), workstream (e.g. Data & measurement, CRM, Paid media, Creative, Launch), title, owner (role), weeks of effort (realistic, 0.5–12), dependsOn (task ids), parallelizable (can run alongside other work if people are available), approval (needs brand/legal/budget sign-off), launch (a go-live), deliverable. Put measurement-readiness work first when needed. Do not shorten durations: the scheduler builds the aggressive and conservative versions.
- kpis: a KPI tree: exactly one north_star, 2–4 primary, 2–4 secondary, 1–3 guardrail (e.g. unsubscribe rate, margin, complaint rate). Each with definition, baseline (only if stated in the context; otherwise omit), target (relative to the baseline, or omit), cadence, data source and evidenceKind.
- experiments: 2–4 tests with hypothesis, metric, design (control/holdout), success threshold and duration.
- risks: 4–8 across budget, data, technology, compliance, resourcing, execution and market, with likelihood, impact and mitigation.
- first30Days: 5–8 concrete actions for the first 30 days.
${STRATEGY_GUARDRAILS}`;

export const PlanOutput = z.object({
  budget: z.array(z.object({
    pace: z.enum(["aggressive", "balanced", "conservative"]),
    summary: z.string(),
    lines: z.array(z.object({ item: z.string(), category: z.enum(["media", "technology", "agency", "creative", "internal"]), oneTime: z.number().min(0), monthly: z.number().min(0), note: z.string().optional() })).max(16),
    forecast: z.object({ metric: z.string(), low: z.number(), base: z.number(), high: z.number(), assumptions: z.array(z.string()) }).optional(),
    scalingCriteria: z.array(z.string()).max(5).default([]),
  })).min(1).max(3),
  tasks: z.array(z.object({
    id: z.string(),
    recommendationId: z.string().optional(),
    workstream: z.string(),
    title: z.string(),
    owner: z.string(),
    weeks: z.number().min(0.5).max(52),
    dependsOn: z.array(z.string()).default([]),
    parallelizable: z.boolean(),
    approval: z.boolean(),
    launch: z.boolean(),
    deliverable: z.string(),
  })).min(1).max(30),
  kpis: z.array(z.object({
    name: z.string(),
    level: z.enum(["north_star", "primary", "secondary", "guardrail"]),
    definition: z.string(),
    baseline: z.string().optional(),
    target: z.string().optional(),
    cadence: z.string(),
    source: z.string(),
    evidenceKind: Evidence,
  })).min(1).max(14),
  experiments: z.array(z.object({ name: z.string(), hypothesis: z.string(), metric: z.string(), design: z.string(), successThreshold: z.string(), duration: z.string() })).max(5).default([]),
  risks: z.array(z.object({ risk: z.string(), category: z.string(), likelihood: z.enum(["low", "medium", "high"]), impact: z.enum(["low", "medium", "high"]), mitigation: z.string() })).max(10).default([]),
  first30Days: z.array(z.string()).max(10).default([]),
});

export async function planStrategy(deps: AgentDeps, c: Case, recs: StrategyRecommendation[]) {
  const s = c.strategy!;
  return runAgent(deps, "strategy_plan", "reasoning", PLAN_SYSTEM, {
    ...common(c),
    PILLARS: JSON.stringify(s.pillars),
    RECOMMENDATIONS: JSON.stringify(recs.map((r) => ({ id: r.id, title: r.title, action: r.action, channels: r.channels, owner: r.owner, timeline: r.timeline, budget: r.budget, kpi: r.kpi, dependencies: r.dependencies, needsNewTech: r.needsNewTech }))),
    "MEASUREMENT READINESS": JSON.stringify(s.measurementReadiness),
    CURRENCY: c.currency,
  }, PlanOutput, { case: c, maxTokens: 12_000 });
}

/* -------------------------------- Debate ---------------------------------- */

const DEBATE_SYSTEM = `${STRATEGY_PERSONA}
TASK: Run a structured devil's-advocate debate on each RECOMMENDATION so the client sees the strongest case against it before approving.
For EVERY recommendation id:
1. challenges: the 2–3 PANEL members whose lens matters most, each with their strongest specific objection (max ~70 words, in their voice, about THIS plan): feasibility, budget and payback, measurability, customer response, competitive response, capacity, or a better use of the same money. Offer a concrete alternative where possible ("alternative") and what would change their mind ("wouldChangeMind").
2. defense: Pilot answers using ONLY evidence in the context (quote it in "evidence"). If the evidence is thin, concede it.
3. verdict: an impartial judge rules "survives", "weakened" or "refuted", with calibrated confidence, one or two sentences of reasoning, and up to 3 checks or tests that would settle it ("settleWith").
${STRATEGY_GUARDRAILS}`;

export const StrategyDebateOutput = z.object({
  debates: z.array(z.object({
    recommendationId: z.string(),
    challenges: z.array(z.object({ panelistId: z.string(), argument: z.string(), alternative: z.string().optional(), wouldChangeMind: z.string().optional() })).min(1).max(3),
    defense: z.object({ argument: z.string(), evidence: z.array(z.string()).max(5).default([]) }),
    verdict: z.object({ outcome: z.enum(["survives", "weakened", "refuted"]), confidence: z.number().min(0).max(1), reasoning: z.string(), settleWith: z.array(z.string()).max(3).default([]) }),
  })),
});

export async function debateStrategy(deps: AgentDeps, c: Case, recs: StrategyRecommendation[]): Promise<Record<string, Omit<Debate, "at" | "model">>> {
  const out = await runAgent(deps, "strategy_debate", "reasoning", DEBATE_SYSTEM, {
    ...common(c),
    PANEL: JSON.stringify(STRATEGY_CHALLENGERS.map((p) => ({ id: p.id, name: p.name, role: p.role, lens: p.lens }))),
    RECOMMENDATIONS: JSON.stringify(recs.map((r) => ({ id: r.id, title: r.title, action: r.action, evidence: r.evidence, evidenceKind: r.evidenceKind, budget: r.budget, kpi: r.kpi, confidence: r.confidence }))),
  }, StrategyDebateOutput, { case: c, maxTokens: 12_000 });
  const ids = new Set(STRATEGY_CHALLENGERS.map((p) => p.id));
  const known = new Set(recs.map((r) => r.id));
  const result: Record<string, Omit<Debate, "at" | "model">> = {};
  for (const d of out.debates) {
    if (!known.has(d.recommendationId)) continue;
    const challenges = d.challenges.filter((x) => ids.has(x.panelistId));
    if (challenges.length) result[d.recommendationId] = { challenges, defense: d.defense, verdict: d.verdict };
  }
  return result;
}

/* --------------------------- Competitor research -------------------------- */

const RESEARCH_SYSTEM = `${STRATEGY_PERSONA}
TASK: Research the named competitors' observable marketing activity for the client.
- PAGES holds facts extracted from competitors' public web pages (titles, headings, calls to action, offers, trust signals). Findings drawn from them are "observed" with the page URL as source.
- You may add well-known public facts about a competitor only as "hypothesis" (to be verified), never as fact.
- Never state or estimate competitors' ad spend, private results, internal strategies or customer data.
- findings: 3–12 across the requested areas (positioning and messaging, offers, calls to action, content, proof and trust, propositions).
- comparisons: ONLY if MODE is "compare": dimensions comparing the client ("us", from CASE CONTEXT) with each competitor. Otherwise an empty list.
- implications: 2–5 implications for the client's strategy.
${STRATEGY_GUARDRAILS}`;

export const ResearchOutput = z.object({
  findings: z.array(z.object({ competitor: z.string(), category: z.string(), finding: z.string(), kind: z.enum(["observed", "sourced", "hypothesis"]), source: z.string().optional() })).max(15),
  comparisons: z.array(z.object({ dimension: z.string(), us: z.string(), them: z.array(z.object({ competitor: z.string(), note: z.string() })) })).max(8).default([]),
  implications: z.array(z.string()).max(6),
});

export async function researchCompetitors(deps: AgentDeps, c: Case, pages: { competitor: string; url: string; description: string }[]) {
  const s = c.strategy!;
  return runAgent(deps, "competitor_research", "reasoning", RESEARCH_SYSTEM, {
    ...common(c),
    MODE: s.settings.competitor,
    COMPETITORS: JSON.stringify(s.settings.competitors.map((x) => x.name)),
    "RESEARCH QUESTIONS": s.settings.researchQuestions || String(c.context.fields["competition.questions"]?.value ?? "not specified"),
    PAGES: pages.length ? pages.map((p) => `[${p.competitor}] ${p.description}`).join("\n\n") : "No pages could be read.",
  }, ResearchOutput, { case: c, maxTokens: 6_000 });
}
