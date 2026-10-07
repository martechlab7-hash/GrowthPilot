import { z } from "zod";
import type {
  ActivationJourney,
  CreativeReview,
  Debate,
  Case,
  Diagnosis,
  Experiment,
  FieldValue,
  Hypothesis,
  JourneyStage,
  MeasurementFramework,
  ProblemType,
  Question,
  Recommendation,
  ReportContent,
} from "@/domain/types";
import { prioritize } from "@/engine/prioritization";
import { assessMaturity } from "@/engine/maturity";
import { candidateQuestions, nextQuestions } from "@/engine/interview";
import { createVault, maskPii, restorePii, type PiiVault } from "@/engine/pii";
import { QUESTION_BANK } from "@/knowledge/questionBank";
import { getFramework } from "@/knowledge/frameworks";
import type { AIGateway, GatewayCallContext } from "../gateway";
import type { AIEvent, ChatImage, ModelTier } from "../types";
import { buildAgentContext, serializeContext } from "./context";
import * as P from "./prompts";
import * as S from "./schemas";

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/** Receives human-readable progress for the activity panel. */
export interface Progress {
  step(label: string, detail?: string): void;
  ai(e: AIEvent): void;
  /** What the analysis is looking at (frameworks, facts, shared data). */
  analysis?(label: string, detail?: string): void;
  /** The model's own short summary of how it reasoned. */
  think?(thought: string): void;
}

const AGENT_LABELS: Record<string, string> = {
  extraction: "Fact extraction",
  planner: "Interview Planner",
  debate: "Debate panel",
  interview: "Interview Agent",
  diagnostic: "Diagnostic Agent",
  hypothesis: "Hypothesis Agent",
  hypothesis_refine: "Hypothesis refinement",
  recommendation: "Recommendation Agent",
  activation: "Activation Agent",
  measurement: "Measurement Agent",
  report: "Report Agent",
  chat: "Case assistant",
  comms_review: "Comms review",
  page_review: "Page review",
};

interface AgentDeps {
  gateway: AIGateway;
  call: GatewayCallContext;
  progress?: Progress;
  /** User-supplied knowledge-base links (titles + notes only; never fetched). */
  references?: string;
}

const REFERENCE_AGENTS = new Set(["interview", "diagnostic", "hypothesis", "recommendation", "activation", "measurement", "report", "debate"]);
const REFERENCE_NOTE =
  "Organisation context. Saved links: only their titles and notes are known (pages were NOT fetched), so never invent their contents. Past cases and measured outcomes: precedent, not proof for this case. Benchmarks: external figures with their source; name the source and keep them separate from the client's own data.";

/** Run one agent with PII masked on the way out and restored on the way back. */
async function runAgent<T extends z.ZodType>(
  deps: AgentDeps,
  agent: string,
  tier: ModelTier,
  system: string,
  sections: Record<string, string>,
  schema: T,
  opts: { maxTokens?: number; case?: Case; images?: ChatImage[] } = {},
): Promise<z.infer<T>> {
  const name = AGENT_LABELS[agent] ?? agent;
  const maxTokens = opts.maxTokens;
  if (opts.case) explainInputs(deps, agent, opts.case);
  if (deps.references && REFERENCE_AGENTS.has(agent)) {
    sections = { ...sections, "ORGANISATION CONTEXT": `${REFERENCE_NOTE}\n${deps.references}` };
  }
  const vault: PiiVault = createVault();
  const prompt = Object.entries(sections)
    .map(([title, body]) => `## ${title}\n${maskPii(body, vault).text}`)
    .join("\n\n");
  deps.progress?.step(
    `${name}: preparing case context`,
    `${Object.keys(sections).join(", ")} · ~${Math.round(prompt.length / 4).toLocaleString("en")} tokens · ${vault.tokens.size} personal data item(s) masked · ${tier} model`,
  );
  // Ask every agent for a short, user-facing audit trail of how it reasoned.
  const traced = schema instanceof z.ZodObject ? schema.extend({ thinking_summary: z.array(z.string()).max(8).optional() }) : schema;
  const { data } = await deps.gateway.generateStructured({
    agent, tier, system: `${system}\n${THINKING_NOTE}`, prompt, schema: traced, context: deps.call, ...(maxTokens ? { maxTokens } : {}),
    ...(opts.images?.length ? { images: opts.images } : {}),
    onEvent: (e) => deps.progress?.ai(e),
  });
  deps.progress?.step(`${name}: output validated`, "Structured JSON matched the expected schema");
  const restored = (vault.tokens.size === 0 ? data : JSON.parse(restorePii(JSON.stringify(data), vault))) as Record<string, unknown>;
  const { thinking_summary: thoughts, ...rest } = restored;
  if (Array.isArray(thoughts)) for (const t of thoughts.slice(0, 8)) if (typeof t === "string" && t.trim()) deps.progress?.think?.(t.trim());
  return (schema instanceof z.ZodObject ? rest : restored) as z.infer<T>;
}

const THINKING_NOTE =
  "Also return thinking_summary: 3–6 short bullets (max ~25 words each) explaining to the user how you approached this: what evidence you weighed, which frameworks you applied, what you ruled out and why. It is a brief audit trail shown in the product, not hidden reasoning.";

/** Log, in plain language, what the agent is about to analyse. */
function explainInputs(deps: AgentDeps, agent: string, c: Case) {
  const p = deps.progress;
  if (!p?.analysis) return;
  const fields = Object.values(c.context.fields);
  const facts = fields.filter((f) => f.kind === "fact").length;
  p.analysis("Reading the case", `${fields.length} known facts (${facts} confirmed by you, ${fields.length - facts} inferred) · ${c.context.unknownKeys.length} marked unknown · problem type: ${c.problemTypes.join(", ") || "unclassified"}`);
  if (["diagnostic", "hypothesis", "recommendation", "report"].includes(agent) && c.selectedFrameworks.length) {
    p.analysis("Applying diagnostic frameworks", c.selectedFrameworks.map((id) => getFramework(id)?.name ?? id).slice(0, 6).join(" · "));
  }
  if (c.datasets?.length) {
    p.analysis("Using data you shared", c.datasets.map((d) => (d.kind === "table" ? `${d.name} (${d.rowCount} rows, ${d.columns?.length} columns)` : `${d.name} (notes)`)).join(" · "));
  }
  const shots = c.comms?.screenshots.filter((x) => x.review).length ?? 0;
  const pages = c.comms?.pages.filter((x) => x.facts).length ?? 0;
  const cadence = c.context.fields["marketing.cadence"]?.value;
  if (shots || pages || (Array.isArray(cadence) && cadence.length)) {
    p.analysis("Using your real communications", [shots ? `${shots} reviewed message screenshot(s)` : "", pages ? `${pages} page(s) read` : "", Array.isArray(cadence) && cadence.length ? `contact calendar with ${cadence.length} message(s)` : ""].filter(Boolean).join(" · "));
  }
  const agreed = c.hypotheses.filter((h) => h.status === "agreed" || h.status === "partially_agreed").length;
  const rejected = c.hypotheses.filter((h) => h.status === "disagreed").length;
  if (["recommendation", "activation", "measurement", "report", "hypothesis"].includes(agent) && (agreed || rejected)) {
    p.analysis("Respecting your hypothesis review", `${agreed} agreed or partially agreed will be built on · ${rejected} rejected will not be re-proposed`);
  }
  if (["recommendation", "activation"].includes(agent)) {
    const tools = c.context.fields["technology.vendors"]?.value;
    if (Array.isArray(tools) && tools.length) p.analysis("Planning around your current tools", tools.slice(0, 8).join(", "));
  }
}

/* ------------------------------------------------------------------------ */

export interface ExtractedFact {
  key: string;
  value: FieldValue;
  confidence: "high" | "medium" | "low";
}

const RICH_INPUTS = new Set(["links", "images", "cadence"]);

/** Context extraction: structured facts explicitly stated in free text. */
export async function extractFacts(
  deps: AgentDeps,
  text: string,
): Promise<{ facts: ExtractedFact[]; problemTypes: ProblemType[] }> {
  // Links, screenshots and calendars are only ever entered through their own inputs.
  const allowed = QUESTION_BANK.filter((q) => !RICH_INPUTS.has(q.input)).map((q) => ({
    key: q.key,
    input: q.input,
    ...(q.options ? { options: q.options } : {}),
  }));
  const out = await runAgent(deps, "extraction", "fast", P.EXTRACTION_SYSTEM, {
    "ALLOWED KEYS": JSON.stringify(allowed),
    TEXT: text,
  }, S.ExtractionOutput);
  const byKey = new Map(QUESTION_BANK.map((q) => [q.key, q]));
  const facts = out.facts.filter((f) => {
    const q = byKey.get(f.key);
    if (!q || RICH_INPUTS.has(q.input)) return false;
    if (q.input === "select") return typeof f.value === "string" && !!q.options?.includes(f.value);
    if (q.input === "multiselect") {
      return Array.isArray(f.value) && f.value.length > 0 && f.value.every((v) => q.options?.includes(v));
    }
    if (["number", "percent", "currency"].includes(q.input)) return typeof f.value === "number";
    return typeof f.value === "string" && f.value.trim().length > 0;
  });
  return { facts, problemTypes: out.problemTypes };
}

export interface InterviewPlan {
  metric: string;
  focus: string;
  items: Record<string, { prompt?: string; why?: string; skip?: boolean }>;
}

/** Interview Planner: decide which bank questions matter for this case and phrase them in its context. */
export async function planInterview(deps: AgentDeps, c: Case): Promise<InterviewPlan> {
  // Phrased for this case's goal and sales channel, so rewording starts from the right framing.
  const qs = nextQuestions(c, 500).filter((q) => q.origin !== "ai");
  const list = qs.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    input: q.input,
    ...(q.options ? { options: q.options.slice(0, 10) } : {}),
    ...(q.critical ? { critical: true } : {}),
  }));
  const out = await runAgent(deps, "planner", "fast", P.PLANNER_SYSTEM, {
    "PROBLEM STATEMENT": c.problemStatement,
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    QUESTIONS: JSON.stringify(list),
  }, S.InterviewPlanOutput, { maxTokens: 6_000, case: c });
  const known = new Set(qs.map((q) => q.id));
  const items: InterviewPlan["items"] = {};
  for (const r of out.questions) {
    if (!known.has(r.id)) continue;
    const prompt = r.prompt?.trim();
    items[r.id] = {
      ...(prompt && prompt.length >= 8 ? { prompt } : {}),
      ...(r.why?.trim() ? { why: r.why.trim() } : {}),
      ...(r.relevant ? {} : { skip: true }),
    };
  }
  // Guard against an over-eager planner: never drop more than half the interview.
  const skipped = Object.entries(items).filter(([, v]) => v.skip);
  if (skipped.length > qs.length / 2) for (const [, v] of skipped) delete v.skip;
  return { metric: out.metric.trim().toLowerCase().slice(0, 80), focus: out.focus.trim().slice(0, 400), items };
}

/** Devil's-advocate debate: panel challenges, Pilot defends, judge rules. */
export async function debateHypotheses(deps: AgentDeps, c: Case, hypotheses: Hypothesis[]): Promise<Record<string, Omit<Debate, "at" | "model">>> {
  const { CHALLENGERS } = await import("@/knowledge/debatePanel");
  const out = await runAgent(deps, "debate", "reasoning", P.DEBATE_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    PANEL: JSON.stringify(CHALLENGERS.map((p) => ({ id: p.id, name: p.name, role: p.role, lens: p.lens }))),
    HYPOTHESES: JSON.stringify(hypotheses.map((h) => ({ id: h.id, statement: h.statement, driver: h.driver, evidence: h.evidence, missingEvidence: h.missingEvidence, confidence: h.confidence }))),
  }, S.DebateOutput, { case: c, maxTokens: 10_000 });
  const ids = new Set(CHALLENGERS.map((p) => p.id));
  const known = new Set(hypotheses.map((h) => h.id));
  const result: Record<string, Omit<Debate, "at" | "model">> = {};
  for (const d of out.debates) {
    if (!known.has(d.hypothesisId)) continue;
    const challenges = d.challenges.filter((x) => ids.has(x.panelistId));
    if (!challenges.length) continue;
    result[d.hypothesisId] = { challenges, defense: d.defense, verdict: d.verdict };
  }
  return result;
}

/** Interview Agent: adaptive questions beyond the bank. */
export async function proposeFollowUps(
  deps: AgentDeps,
  c: Case,
): Promise<{ note: string; questions: Question[] }> {
  const covered = candidateQuestions(c).map((q) => q.prompt);
  const out = await runAgent(deps, "interview", "fast", P.INTERVIEW_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    "ALREADY COVERED": JSON.stringify(covered),
  }, S.InterviewOutput, { case: c });
  const prefix: Record<string, string> = {
    business: "business", diagnosis: "performance", customer: "customer", data: "data",
    technology: "technology", activation: "marketing", measurement: "measurement", economics: "economics",
  };
  const questions: Question[] = out.followUps.map((f) => ({
    id: `ai-${f.slug}`,
    key: `${prefix[f.stage]}.ai_${f.slug}`,
    stage: f.stage,
    category: f.category,
    prompt: f.prompt,
    why: f.why,
    input: f.input,
    ...(f.options?.length ? { options: f.options } : {}),
    businessImpact: f.businessImpact,
    diagnosticValue: f.diagnosticValue,
    decisionRelevance: f.decisionRelevance,
    critical: false,
    origin: "ai",
  }));
  return { note: out.consultantNote, questions };
}

export async function runDiagnosis(deps: AgentDeps, c: Case): Promise<Diagnosis> {
  const maturity = assessMaturity(c.context);
  const out = await runAgent(deps, "diagnostic", "reasoning", P.DIAGNOSTIC_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    "MARTECH MATURITY (computed)": JSON.stringify(maturity),
  }, S.DiagnosticOutput, { case: c });
  return { ...out, generatedAt: new Date().toISOString() };
}

export async function generateHypotheses(deps: AgentDeps, c: Case): Promise<Hypothesis[]> {
  const out = await runAgent(deps, "hypothesis", "reasoning", P.HYPOTHESIS_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    DIAGNOSIS: JSON.stringify(c.diagnosis ?? null),
  }, S.HypothesisOutput, { case: c });
  return out.hypotheses.map((h) => ({
    ...h,
    id: newId("hyp"),
    status: "proposed" as const,
    clarifyingQuestions: [],
    editedByUser: false,
  }));
}

export async function refineHypothesis(
  deps: AgentDeps,
  c: Case,
  h: Hypothesis,
  feedback: string,
): Promise<{ revised: Hypothesis; clarifyingQuestions: string[] }> {
  const out = await runAgent(deps, "hypothesis_refine", "reasoning", P.REFINE_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    HYPOTHESIS: JSON.stringify({ statement: h.statement, driver: h.driver, evidence: h.evidence, confidence: h.confidence }),
    "USER FEEDBACK": feedback,
  }, S.RefineOutput, { case: c });
  return {
    revised: { ...h, ...out.revised, clarifyingQuestions: out.clarifyingQuestions },
    clarifyingQuestions: out.clarifyingQuestions,
  };
}

export async function generateRecommendations(deps: AgentDeps, c: Case): Promise<Recommendation[]> {
  const maturity = assessMaturity(c.context);
  const out = await runAgent(deps, "recommendation", "reasoning", P.RECOMMENDATION_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    DIAGNOSIS: JSON.stringify(c.diagnosis ?? null),
    "MARTECH MATURITY (computed)": JSON.stringify(maturity),
  }, S.RecommendationOutput, { case: c });
  const approved = new Set(
    c.hypotheses.filter((h) => h.status === "agreed" || h.status === "partially_agreed").map((h) => h.id),
  );
  const withIds = out.recommendations.map((r) => ({
    ...r,
    id: newId("rec"),
    hypothesisIds: r.hypothesisIds.filter((id) => approved.has(id)),
  }));
  return prioritize(withIds);
}

export async function generateActivation(
  deps: AgentDeps,
  c: Case,
): Promise<{ customerJourney: JourneyStage[]; journeys: ActivationJourney[] }> {
  const out = await runAgent(deps, "activation", "reasoning", P.ACTIVATION_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    RECOMMENDATIONS: JSON.stringify(c.recommendations.map((r) => ({ id: r.id, title: r.title, priority: r.priority, activation: r.activation, targetCustomer: r.targetCustomer }))),
  }, S.ActivationOutput, { case: c });
  const recIds = new Set(c.recommendations.map((r) => r.id));
  return {
    customerJourney: out.customerJourney,
    journeys: out.journeys.map((j) => {
      const { recommendationId, ...rest } = j;
      return {
        ...rest,
        id: newId("jrn"),
        ...(recommendationId && recIds.has(recommendationId) ? { recommendationId } : {}),
      };
    }),
  };
}

export async function generateMeasurement(
  deps: AgentDeps,
  c: Case,
): Promise<{ measurement: MeasurementFramework; experiments: Experiment[] }> {
  const out = await runAgent(deps, "measurement", "reasoning", P.MEASUREMENT_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    RECOMMENDATIONS: JSON.stringify(c.recommendations.map((r) => ({ id: r.id, title: r.title, measurement: r.measurement, expectedLiftPct: r.expectedLiftPct }))),
  }, S.MeasurementOutput, { case: c });
  const { experiments, ...measurement } = out;
  return { measurement, experiments: experiments.map((e) => ({ ...e, id: newId("exp") })) };
}

export async function generateReport(deps: AgentDeps, c: Case): Promise<ReportContent> {
  const out = await runAgent(deps, "report", "large", P.REPORT_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    DIAGNOSIS: JSON.stringify(c.diagnosis ?? null),
    "APPROVED HYPOTHESES": JSON.stringify(c.hypotheses.filter((h) => h.status !== "disagreed" && h.status !== "proposed")),
    RECOMMENDATIONS: JSON.stringify(c.recommendations),
    "MEASUREMENT": JSON.stringify(c.measurement ?? null),
    "ECONOMICS (deterministic model)": JSON.stringify(c.economics ?? "not modelled"),
    "MARTECH MATURITY (computed)": JSON.stringify(assessMaturity(c.context)),
  }, S.ReportOutput, { case: c });
  return { ...out, title: c.name, generatedAt: new Date().toISOString() };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Case-scoped Q&A over the full dossier. */
export async function answerCaseQuestion(
  deps: AgentDeps,
  c: Case,
  history: ChatTurn[],
  question: string,
): Promise<{ answer: string; citations: string[]; outOfScope: boolean; followUps: string[] }> {
  const dossier = {
    context: buildAgentContext(c),
    diagnosis: c.diagnosis ?? null,
    hypotheses: c.hypotheses.map((h, i) => ({ ref: `Hypothesis ${i + 1}`, statement: h.statement, status: h.status, confidence: h.confidence, evidence: h.evidence, missingEvidence: h.missingEvidence, userFeedback: h.userFeedback })),
    recommendations: c.recommendations.map((r) => ({ ref: `Recommendation: ${r.title}`, ...r })),
    customerJourney: c.customerJourney,
    activationJourneys: c.journeys,
    measurement: c.measurement ?? null,
    experiments: c.experiments,
    economics: c.economics ?? "not modelled",
    dataGaps: c.dataGaps,
    assumptions: c.assumptions,
    report: c.report ?? null,
    martechMaturity: assessMaturity(c.context),
  };
  return runAgent(deps, "chat", "reasoning", P.CHAT_SYSTEM, {
    "CASE DOSSIER": JSON.stringify(dossier),
    "CONVERSATION SO FAR": history.slice(-10).map((t) => `${t.role.toUpperCase()}: ${t.content.slice(0, 2000)}`).join("\n") || "(none)",
    QUESTION: question,
  }, S.ChatOutput, { case: c });
}

const clean = (xs: string[] | undefined, n: number) => (xs ?? []).map((x) => x.trim()).filter(Boolean).slice(0, n);

/** Comms review: a vision model reads screenshots of the client's real messages. */
export async function reviewScreenshots(
  deps: AgentDeps,
  c: Case,
  shots: { channel?: string; name: string; image: ChatImage }[],
): Promise<{ reviews: (CreativeReview | undefined)[]; overall: string }> {
  const out = await runAgent(deps, "comms_review", "fast", P.COMMS_REVIEW_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    SCREENSHOTS: JSON.stringify(shots.map((s, index) => ({ index, file: s.name, ...(s.channel ? { channel: s.channel } : {}) }))),
  }, S.CommsReviewOutput, { maxTokens: 6_000, images: shots.map((s) => s.image) });
  const reviews = shots.map((_, i) => {
    const r = out.reviews.find((x) => x.index === i);
    if (!r) return undefined;
    return {
      summary: r.summary.trim(),
      ...(r.channel?.trim() ? { channel: r.channel.trim() } : {}),
      ...(r.message?.trim() ? { message: r.message.trim() } : {}),
      ...(r.cta?.trim() ? { cta: r.cta.trim() } : {}),
      ...(r.offer?.trim() ? { offer: r.offer.trim() } : {}),
      ...(r.personalisation?.trim() ? { personalisation: r.personalisation.trim() } : {}),
      strengths: clean(r.strengths, 4),
      issues: clean(r.issues, 4),
      ideas: clean(r.ideas, 3),
    };
  });
  return { reviews, overall: out.overall.trim() };
}

/** Page review: judges pages from facts extracted from their HTML. */
export async function reviewPages(
  deps: AgentDeps,
  c: Case,
  pages: { url: string; description: string }[],
): Promise<Record<string, Omit<CreativeReview, "channel" | "personalisation">>> {
  const out = await runAgent(deps, "page_review", "fast", P.PAGE_REVIEW_SYSTEM, {
    "CASE CONTEXT": serializeContext(buildAgentContext(c)),
    PAGES: pages.map((p) => p.description).join("\n\n"),
  }, S.PageReviewOutput, { maxTokens: 5_000 });
  const result: Record<string, Omit<CreativeReview, "channel" | "personalisation">> = {};
  for (const p of out.pages) {
    const match = pages.find((x) => x.url === p.url.trim()) ?? pages.find((x) => p.url.includes(x.url) || x.url.includes(p.url));
    if (!match) continue;
    result[match.url] = {
      summary: p.summary.trim(),
      ...(p.message?.trim() ? { message: p.message.trim() } : {}),
      ...(p.cta?.trim() ? { cta: p.cta.trim() } : {}),
      ...(p.offer?.trim() ? { offer: p.offer.trim() } : {}),
      strengths: clean(p.strengths, 4),
      issues: clean(p.issues, 4),
      ideas: clean(p.ideas, 3),
    };
  }
  return result;
}
