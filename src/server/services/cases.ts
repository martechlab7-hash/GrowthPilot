import "server-only";
import { z } from "zod";
import * as agents from "@/ai/agents";
import { AIUnavailableError } from "@/ai/types";
import {
  EconomicsInputsSchema,
  FieldValueSchema,
  type Assumption,
  type Case,
  type CaseSummary,
  type CaseVersion,
  type DecisionLogEntry,
  type EconomicsInputs,
  type FieldValue,
  type Hypothesis,
  type KnowledgeKind,
  type Organization,
  type Question,
  type TranscriptEntry,
  type Dataset,
} from "@/domain/types";
import { classifyProblem } from "@/engine/classify";
import { emptyContext, getNumber, isKnown, markUnknown, setField } from "@/engine/context";
import { computeEconomics } from "@/engine/economics";
import { selectFrameworks } from "@/engine/frameworkSelection";
import { findQuestion, nextQuestions, questionsToReady, readiness, stageCoverage, sufficiencyStatements } from "@/engine/interview";
import { assessMaturity } from "@/engine/maturity";
import { overallProgress, stageProgress } from "@/engine/progress";
import { prioritize } from "@/engine/prioritization";
import { resourcesForAgents } from "./resources";
import { memoryForAgents } from "./memory";
import { getIndustry, industryIdFromName } from "@/knowledge/industries";
import type { AuthContext } from "../auth";
import { badRequest, HttpError, notFound } from "../errors";
import { log } from "../logger";
import { verifyEvidence, withAssessment } from "@/engine/verify";
import { getEconomicsModel, modelForProblem } from "@/engine/economicsModels";
import { inBackground } from "../background";
import { can } from "../permissions";
import { parseDelimited } from "@/lib/data/csv";
import { detectPiiColumns, maskColumns, maskFreeText } from "@/lib/data/pii";
import { profileTable } from "@/lib/data/profile";
import { analyzeTable } from "@/lib/data/analyze";
import { getStore } from "../store";
import { audit } from "./org";
import { gatewayFor, secondOpinion } from "./providers";
import { ActivityRecorder, getActivity } from "./activity";
import { assertAiQuota, PLAN_LIMITS } from "./usage";
import { diffVersions } from "./versionDiff";

const cases = () => getStore().collection<Case>("cases");
const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${crypto.randomUUID().slice(0, 10)}`;

/* -------------------------------------------------------------------------- */
/* Validation schemas                                                          */
/* -------------------------------------------------------------------------- */

export const CreateCaseSchema = z.object({
  name: z.string().trim().min(3).max(200),
  problemStatement: z.string().trim().min(20, "Describe the problem in at least a sentence").max(10_000),
  industry: z.string().max(80).optional(),
  geography: z.string().max(200).optional(),
  companySize: z.string().max(80).optional(),
  businessModel: z.array(z.string().max(40)).max(6).optional(),
  objective: z.array(z.string().max(80)).max(7).optional(),
  revenueModel: z.string().max(200).optional(),
  existingTools: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
});

export const UpdateCaseSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  notes: z.string().max(20_000).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["draft", "discovery", "validation", "strategy", "completed"]).optional(),
  revision: z.number().int().optional(),
  dismissPending: z.boolean().optional(),
});

export const AnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().max(80),
        value: FieldValueSchema.optional(),
        unknown: z.boolean().optional(),
        note: z.string().max(2000).optional(),
        /** Free-text "Other" answer for select / multiselect questions. */
        other: z.string().trim().max(2000).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const ContextEditSchema = z.object({
  key: z.string().regex(/^[a-z_]+\.[a-z0-9_]+$/).max(80),
  value: FieldValueSchema,
  kind: z.enum(["fact", "assumption"]).default("fact"),
});

export const ReviewSchema = z.object({
  action: z.enum(["agree", "partially_agree", "disagree", "edit"]),
  feedback: z.string().max(4000).optional(),
  statement: z.string().min(10).max(1000).optional(),
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function entry(role: TranscriptEntry["role"], kind: TranscriptEntry["kind"], text: string, questionId?: string): TranscriptEntry {
  return { id: id("msg"), role, kind, text, ...(questionId ? { questionId } : {}), createdAt: now() };
}

function touch(c: Case, uid: string): Case {
  const next = { ...c, updatedAt: now(), updatedBy: uid, revision: c.revision + 1 };
  next.progress = overallProgress(next);
  return next;
}

export function summarize(c: Case): CaseSummary {
  return {
    id: c.id, name: c.name, status: c.status, progress: c.progress,
    industryId: c.industryId, problemTypes: c.problemTypes, updatedAt: c.updatedAt, createdAt: c.createdAt,
  };
}

async function loadCase(auth: AuthContext, caseId: string): Promise<Case> {
  const c = await cases().get(caseId);
  // Tenant isolation: a case from another organization is indistinguishable from a missing one.
  if (!c || c.organizationId !== auth.orgId) throw notFound("Case");
  return c;
}

/** Atomic mutation scoped to the caller's organization. */
async function mutate(auth: AuthContext, caseId: string, fn: (c: Case) => Case): Promise<Case> {
  let missing = false;
  const out = await cases().transact(caseId, (current) => {
    if (!current || current.organizationId !== auth.orgId) {
      missing = true;
      return null;
    }
    return touch(fn(current), auth.uid);
  });
  if (missing || !out) throw notFound("Case");
  return out;
}

async function decision(auth: AuthContext, caseId: string, d: Pick<DecisionLogEntry, "decision" | "reason" | "evidence" | "impact">) {
  const row: DecisionLogEntry = { id: id("dec"), organizationId: auth.orgId, caseId, createdBy: auth.uid, createdAt: now(), ...d };
  await getStore().collection<DecisionLogEntry>("decision_logs").set(row);
}

async function snapshot(auth: AuthContext, c: Case, label: string): Promise<Case> {
  const version = c.analysisVersion + 1;
  const v: CaseVersion = {
    id: `${c.id}_v${version}`,
    organizationId: c.organizationId,
    caseId: c.id,
    version,
    label,
    createdBy: auth.uid,
    createdAt: now(),
    snapshot: {
      context: c.context, diagnosis: c.diagnosis, hypotheses: c.hypotheses, recommendations: c.recommendations,
      measurement: c.measurement, experiments: c.experiments, economics: c.economics, report: c.report, status: c.status,
    },
  };
  await getStore().collection<CaseVersion>("case_versions").set(JSON.parse(JSON.stringify(v)) as CaseVersion);
  return mutate(auth, c.id, (cur) => ({ ...cur, analysisVersion: version }));
}

async function orgPlan(orgId: string) {
  const org = await getStore().collection<Organization & { id: string }>("organizations").get(orgId);
  return org?.plan ?? "free";
}

/**
 * Run an AI operation with quota checks. On failure the case is flagged with a
 * resumable pending operation — user work is never lost (spec §74).
 */
async function withAi<T>(
  auth: AuthContext,
  c: Case,
  operation: string,
  fn: (deps: { gateway: Awaited<ReturnType<typeof gatewayFor>>; call: { organizationId: string; userId: string; caseId: string }; progress: ActivityRecorder; references?: string }) => Promise<T>,
  opts: { flagPending?: boolean } = {},
): Promise<T> {
  await assertAiQuota(auth.orgId, await orgPlan(auth.orgId));
  const gateway = await gatewayFor(auth.orgId, auth.aiPreference);
  if (!gateway.hasProviders) {
    throw new HttpError(412, "Configure an AI provider in Settings → AI Providers to run this analysis.", "NO_AI_PROVIDER");
  }
  const progress = new ActivityRecorder(auth.orgId, c.id, operation);
  progress.step("Started", `${Object.keys(c.context.fields).length} context facts · ${c.selectedFrameworks.length} diagnostic frameworks selected`);
  try {
    const [links, memory] = operation === "chat" ? [undefined, undefined] : await Promise.all([
      resourcesForAgents(auth.orgId).catch(() => undefined),
      ["recommendations", "plan", "report", "diagnose", "hypotheses"].includes(operation) ? memoryForAgents(auth.orgId, c).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (memory) progress.analysis("Checking your organisation's history", memory.split("\n").map((l) => l.split(":")[0]).join(" · "));
    const references = [links, memory ? `ORGANISATION HISTORY (past cases and measured outcomes):\n${memory}` : undefined].filter(Boolean).join("\n\n") || undefined;
    if (references) progress.step("Knowledge base", `${references.split("\n").length} organization reference link(s) shared with the agents`);
    const result = await fn({ gateway, call: { organizationId: auth.orgId, userId: auth.uid, caseId: c.id }, progress, ...(references ? { references } : {}) });
    await progress.finish("succeeded");
    return result;
  } catch (err) {
    const reason = err instanceof AIUnavailableError ? err.attempts.at(-1) : err instanceof Error ? err.message : String(err);
    await progress.finish("failed", reason?.slice(0, 300));
    if (err instanceof AIUnavailableError && opts.flagPending !== false) {
      await mutate(auth, c.id, (cur) => ({ ...cur, pendingOperation: { operation, message: `${err.message}${err.attempts.length ? ` Reason: ${err.attempts.at(-1)!.slice(0, 300)}` : ""}`, failedAt: now() } }));
    }
    throw err;
  }
}

/** Chat runs through the same quota, provider choice and activity log, without pending-operation flags. */
export async function withAiForChat<T>(auth: AuthContext, c: Case, fn: Parameters<typeof withAi<T>>[3]): Promise<T> {
  return withAi(auth, c, "chat", fn, { flagPending: false });
}

function clearPending(c: Case): Case {
  const { pendingOperation: _p, ...rest } = c;
  void _p;
  return rest as Case;
}

/* -------------------------------------------------------------------------- */
/* CRUD                                                                        */
/* -------------------------------------------------------------------------- */

export async function listCases(auth: AuthContext, filter?: string): Promise<CaseSummary[]> {
  const rows = await cases().query({
    where: [["organizationId", "==", auth.orgId]],
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: 200,
  });
  const filtered = rows.filter((c) =>
    filter === "drafts" ? c.status === "draft" : filter === "completed" ? c.status === "completed" : filter === "active" ? !["draft", "completed"].includes(c.status) : true,
  );
  return filtered.map(summarize);
}

export async function createCase(auth: AuthContext, input: z.infer<typeof CreateCaseSchema>): Promise<Case> {
  const plan = await orgPlan(auth.orgId);
  const existing = await cases().query({ where: [["organizationId", "==", auth.orgId]] });
  const active = existing.filter((c) => c.status !== "completed").length;
  if (active >= PLAN_LIMITS[plan].activeCases) {
    throw new HttpError(402, `The ${plan} plan allows ${PLAN_LIMITS[plan].activeCases} active cases. Complete or delete a case, or upgrade.`, "PLAN_LIMIT");
  }

  const t = now();
  const by = auth.uid;
  let ctx = emptyContext();
  let industryId: string | undefined;

  if (input.industry) {
    industryId = industryIdFromName(input.industry);
    const name = getIndustry(industryId)?.name ?? input.industry;
    ctx = setField(ctx, { key: "business.industry", value: name, by, at: t });
  } else {
    // A keyword match is an inference, not a fact: it will still be confirmed.
    industryId = industryIdFromName(input.problemStatement);
    if (industryId) {
      ctx = setField(ctx, {
        key: "business.industry", value: getIndustry(industryId)!.name,
        source: "ai_inference", kind: "inference", confidence: "medium", by: "system", at: t,
      });
    }
  }
  const optional: [string, FieldValue | undefined][] = [
    ["business.geography", input.geography],
    ["business.company_size", input.companySize],
    ["business.business_model", input.businessModel?.length ? input.businessModel : undefined],
    ["business.primary_objective", input.objective?.length ? input.objective : undefined],
    ["business.revenue_model", input.revenueModel],
    ["technology.tools", input.existingTools],
  ];
  for (const [key, value] of optional) {
    if (value !== undefined && value !== "") ctx = setField(ctx, { key, value, by, at: t });
  }

  const problemTypes = classifyProblem(`${input.name} ${input.problemStatement}`);
  const frameworks = selectFrameworks({ problemStatement: input.problemStatement, problemTypes, industryId });

  const c: Case = {
    id: id("case"),
    organizationId: auth.orgId,
    createdBy: by,
    createdAt: t,
    updatedAt: t,
    updatedBy: by,
    name: input.name,
    problemStatement: input.problemStatement,
    status: "draft",
    progress: 0,
    problemTypes,
    ...(industryId ? { industryId } : {}),
    currency: input.currency,
    context: ctx,
    transcript: [
      entry("user", "message", input.problemStatement),
      entry(
        "consultant",
        "message",
        `Thanks — before recommending anything I want to understand what is actually happening. ` +
          (problemTypes.length ? `This reads as a ${problemTypes.slice(0, 2).join(" / ")} problem. ` : "") +
          (frameworks.length ? `I'll structure the diagnosis using ${frameworks.slice(0, 3).map((f) => f.framework.name).join(", ")}. ` : "") +
          `I'll ask the questions with the highest diagnostic value first.`,
      ),
    ],
    askedQuestionIds: [],
    adaptiveQuestions: [],
    selectedFrameworks: frameworks.map((f) => f.framework.id),
    hypotheses: [],
    recommendations: [],
    customerJourney: [],
    journeys: [],
    experiments: [],
    assumptions: [],
    dataGaps: [],
    analysisVersion: 0,
    revision: 0,
    analysisStale: false,
  };
  c.progress = overallProgress(c);
  const gateway = await gatewayFor(auth.orgId);
  // Tailoring and fact extraction run after the response, so the case opens instantly.
  if (gateway.hasProviders) c.questionPlan = { status: "pending", items: {}, updatedAt: t };
  await cases().set(c);
  await audit(auth.orgId, auth.uid, "case.create", c.id);

  if (gateway.hasProviders) {
    await inBackground("case.enrich", () => enrichCase(auth, c.id, input.problemStatement));
    if (process.env.VITEST) return (await cases().get(c.id)) ?? c;
  }
  return c;
}

/**
 * Background enrichment for a new case: extract facts stated in the problem
 * statement, then let the Interview Planner tailor the questions to it.
 */
async function enrichCase(auth: AuthContext, caseId: string, statement: string) {
  const plan = await orgPlan(auth.orgId);
  try {
    await assertAiQuota(auth.orgId, plan);
    const gateway = await gatewayFor(auth.orgId);
    const { facts } = await agents.extractFacts({ gateway, call: { organizationId: auth.orgId, userId: auth.uid, caseId } }, statement);
    if (facts.length) await applyExtracted(auth, caseId, facts, "problem statement");
  } catch (err) {
    log("warn", "case.extraction_skipped", { caseId, message: (err as Error).message });
  }
  await tailorInterview(auth, caseId);
}

/** Run the Interview Planner once for a case; failures fall back to standard wording. */
async function tailorInterview(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  try {
    const result = await withAi(auth, c, "plan_interview", (deps) => agents.planInterview(deps, c), { flagPending: false });
    await mutate(auth, caseId, (cur) => ({ ...cur, questionPlan: { status: "ready", metric: result.metric, focus: result.focus, items: result.items, updatedAt: now() } }));
  } catch (err) {
    log("warn", "case.tailoring_failed", { caseId, message: (err as Error).message });
    await mutate(auth, caseId, (cur) => ({ ...cur, questionPlan: { status: "failed", items: {}, updatedAt: now() } }));
  }
}

async function applyExtracted(auth: AuthContext, caseId: string, facts: agents.ExtractedFact[], from: string) {
  return mutate(auth, caseId, (c) => {
    let ctx = c.context;
    const added: string[] = [];
    for (const f of facts) {
      if (isKnown(ctx, f.key) && ctx.fields[f.key]?.source === "user") continue;
      ctx = setField(ctx, { key: f.key, value: f.value, source: "ai_extraction", kind: "fact", confidence: f.confidence, by: "ai" });
      added.push(f.key);
    }
    const industryName = ctx.fields["business.industry"]?.value;
    const industryId = typeof industryName === "string" ? industryIdFromName(industryName) ?? c.industryId : c.industryId;
    const transcript = added.length
      ? [...c.transcript, entry("consultant", "message", `I captured ${added.length} fact(s) from your ${from}. You can correct them in the case context.`)]
      : c.transcript;
    return { ...c, context: ctx, transcript, ...(industryId ? { industryId } : {}) };
  });
}

export async function getCase(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  return withDerived(c);
}

/** Case plus deterministic, always-fresh derived views. */
export function withDerived(c: Case) {
  return {
    case: c,
    derived: {
      stages: stageProgress(c),
      coverage: stageCoverage(c),
      readiness: readiness(c),
      maturity: assessMaturity(c.context),
      frameworks: selectFrameworks({ problemStatement: c.problemStatement, problemTypes: c.problemTypes, industryId: c.industryId }).map((m) => ({
        id: m.framework.id, name: m.framework.name, category: m.framework.category, answers: m.framework.answers, reasons: m.reasons,
      })),
      industry: getIndustry(c.industryId) ?? null,
    },
  };
}

export async function updateCase(auth: AuthContext, caseId: string, input: z.infer<typeof UpdateCaseSchema>) {
  const updated = await mutate(auth, caseId, (c) => {
    if (input.revision !== undefined && input.revision !== c.revision && input.notes !== undefined) {
      throw new HttpError(409, "This case was updated elsewhere. Reload to see the latest version.", "CONFLICT");
    }
    const next: Case = {
      ...c,
      ...(input.name ? { name: input.name } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { context: { ...c.context, notes: input.notes } } : {}),
    };
    return input.dismissPending ? clearPending(next) : next;
  });
  return withDerived(updated);
}

export async function deleteCase(auth: AuthContext, caseId: string) {
  await loadCase(auth, caseId);
  const store = getStore();
  for (const name of ["case_versions", "decision_logs"] as const) {
    const col = store.collection<{ id: string; caseId: string }>(name);
    const rows = await col.query({ where: [["organizationId", "==", auth.orgId], ["caseId", "==", caseId]] });
    for (const r of rows) await col.delete(r.id);
  }
  await cases().delete(caseId);
  await audit(auth.orgId, auth.uid, "case.delete", caseId);
}

/* -------------------------------------------------------------------------- */
/* Interview                                                                   */
/* -------------------------------------------------------------------------- */

function validateAnswer(q: Question, value: FieldValue): FieldValue {
  switch (q.input) {
    case "number":
    case "percent":
    case "currency": {
      const n = typeof value === "number" ? value : Number(String(value).replace(/[, ]/g, ""));
      if (!Number.isFinite(n) || n < 0) throw badRequest(`"${q.prompt}" expects a non-negative number`);
      if (q.input === "percent" && n > 100) throw badRequest(`"${q.prompt}" expects a percentage between 0 and 100`);
      return n;
    }
    case "select":
      if (typeof value !== "string" || (q.options && !q.options.includes(value))) throw badRequest(`Choose one of the options for "${q.prompt}"`);
      return value;
    case "multiselect": {
      const arr = Array.isArray(value) ? value : [String(value)];
      if (!arr.length || (q.options && arr.some((v) => !q.options!.includes(v)))) throw badRequest(`Choose from the options for "${q.prompt}"`);
      return arr;
    }
    case "boolean":
      return typeof value === "boolean" ? value : String(value) === "true";
    default: {
      const s = String(value).trim();
      if (!s) throw badRequest(`"${q.prompt}" needs an answer`);
      return s.slice(0, 5000);
    }
  }
}

/** Choice answers may add a free-text "Other: …" entry next to (or instead of) the listed options. */
export function answerWithOther(q: Question, value: FieldValue | undefined, other: string | undefined): FieldValue {
  if (!other || (q.input !== "select" && q.input !== "multiselect")) return validateAnswer(q, value!);
  const extra = `Other: ${other.slice(0, 2000)}`;
  if (q.input === "select") return extra;
  const picked = value === undefined || (Array.isArray(value) && value.length === 0) ? [] : (validateAnswer(q, value) as string[]);
  return [...picked.filter((v) => v !== "Not sure"), extra];
}

export async function answerQuestions(auth: AuthContext, caseId: string, input: z.infer<typeof AnswerSchema>) {
  const current = await loadCase(auth, caseId);
  const resolved = input.answers.map((a) => {
    const q = findQuestion(current, a.questionId);
    if (!q) throw badRequest(`Unknown question ${a.questionId}`);
    const other = a.other?.trim() ? a.other.trim() : undefined;
    if (!a.unknown && a.value === undefined && !other) throw badRequest(`Answer or mark "${q.prompt}" as unknown`);
    return { a, q, value: a.unknown ? undefined : answerWithOther(q, a.value, other) };
  });

  const updated = await mutate(auth, caseId, (c) => {
    let ctx = c.context;
    const transcript = [...c.transcript];
    const asked = new Set(c.askedQuestionIds);
    let industryId = c.industryId;
    for (const { a, q, value } of resolved) {
      transcript.push(entry("consultant", "question", q.prompt, q.id));
      if (value === undefined) {
        ctx = markUnknown(ctx, q.key);
        transcript.push(entry("user", "answer", "I don't know / not available", q.id));
      } else {
        ctx = setField(ctx, { key: q.key, value, questionId: q.id, note: a.note, by: auth.uid });
        transcript.push(entry("user", "answer", Array.isArray(value) ? value.join(", ") : String(value), q.id));
        if (q.key === "business.industry" && typeof value === "string") industryId = industryIdFromName(value) ?? industryId;
      }
      asked.add(q.id);
    }
    const next: Case = {
      ...c,
      context: ctx,
      transcript: transcript.slice(-400),
      askedQuestionIds: [...asked],
      status: c.status === "draft" ? "discovery" : c.status,
      // Any new information after a diagnosis may invalidate it.
      analysisStale: c.analysisStale || !!c.diagnosis,
      ...(industryId ? { industryId } : {}),
    };
    if (industryId !== c.industryId) {
      next.selectedFrameworks = selectFrameworks({ problemStatement: c.problemStatement, problemTypes: c.problemTypes, industryId }).map((m) => m.framework.id);
    }
    // Surface newly-sufficient stages exactly once.
    const before = new Set(sufficiencyStatements(c));
    for (const s of sufficiencyStatements(next)) if (!before.has(s)) next.transcript.push(entry("consultant", "sufficiency", s));
    return next;
  });

  // Free-text answers may contain additional facts; extract them after responding.
  const freeText = resolved
    .filter((r) => (r.q.input === "longtext" || r.a.other) && r.value !== undefined)
    .map((r) => (Array.isArray(r.value) ? r.value.join("; ") : String(r.value)));
  if (freeText.length) {
    await inBackground("answer.extract", async () => {
      const gateway = await gatewayFor(auth.orgId);
      if (!gateway.hasProviders) return;
      await assertAiQuota(auth.orgId, await orgPlan(auth.orgId));
      const { facts } = await agents.extractFacts({ gateway, call: { organizationId: auth.orgId, userId: auth.uid, caseId } }, freeText.join("\n\n"));
      if (facts.length) await applyExtracted(auth, caseId, facts, "answer");
    });
    if (process.env.VITEST) return interviewState(await loadCase(auth, caseId));
  }
  return interviewState(updated);
}

export function interviewState(c: Case, consultantNote?: string) {
  const r = readiness(c);
  const answered = c.transcript.filter((t) => t.role === "user" && t.kind === "answer").length;
  const optional = nextQuestions(c, 500).length;
  const toReady = r.ready ? 0 : Math.max(1, Math.min(questionsToReady(c), optional));
  return {
    ...withDerived(c),
    interview: {
      questions: nextQuestions(c, 3),
      /** toReady: core questions left before diagnosis; optional: every remaining worthwhile question. */
      progress: { answered, toReady, optional, total: answered + toReady },
      sufficiency: sufficiencyStatements(c),
      readiness: r,
      tailoring: c.questionPlan?.status,
      focus: c.questionPlan?.focus,
      consultantNote:
        consultantNote ??
        (r.ready
          ? "I have enough information to form a diagnosis. You can continue answering to raise confidence, or proceed to diagnosis."
          : r.missingCritical.length
            ? `I still need ${r.missingCritical.length} critical answer(s) before I can form reliable hypotheses.`
            : "A few more answers will materially improve the diagnosis."),
    },
  };
}

export async function getInterview(auth: AuthContext, caseId: string) {
  let c = await loadCase(auth, caseId);
  // Cases created before tailoring existed get a plan the first time the interview opens.
  if (!c.questionPlan && !c.diagnosis && auth.profile && can(auth.profile.role, "case.contribute")) {
    const gateway = await gatewayFor(auth.orgId);
    if (gateway.hasProviders) {
      c = await mutate(auth, caseId, (cur) => (cur.questionPlan ? cur : { ...cur, questionPlan: { status: "pending", items: {}, updatedAt: now() } }));
      await inBackground("case.tailor", () => tailorInterview(auth, caseId));
    }
  }
  return interviewState(c);
}

/** Ask the Interview Agent for adaptive follow-ups beyond the question bank. */
export async function deepenInterview(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  const { note, questions } = await withAi(auth, c, "interview", (deps) => agents.proposeFollowUps(deps, c));
  const updated = await mutate(auth, caseId, (cur) => {
    const existing = new Set(cur.adaptiveQuestions.map((q) => q.id));
    const fresh = questions.filter((q) => !existing.has(q.id) && !cur.askedQuestionIds.includes(q.id));
    return clearPending({
      ...cur,
      adaptiveQuestions: [...cur.adaptiveQuestions, ...fresh].slice(-30),
      transcript: [...cur.transcript, entry("consultant", "message", note)],
    });
  });
  return interviewState(updated, note);
}

/** Manually add or correct a context field (the "Add information" path). */
export async function editContext(auth: AuthContext, caseId: string, input: z.infer<typeof ContextEditSchema>) {
  const updated = await mutate(auth, caseId, (c) => {
    const kind: KnowledgeKind = input.kind;
    const ctx = setField(c.context, { key: input.key, value: input.value, kind, confidence: kind === "fact" ? "high" : "low", by: auth.uid });
    const industryId = input.key === "business.industry" && typeof input.value === "string" ? industryIdFromName(input.value) ?? c.industryId : c.industryId;
    return {
      ...c,
      context: ctx,
      analysisStale: !!c.diagnosis,
      ...(industryId ? { industryId } : {}),
      transcript: [...c.transcript, entry("user", "message", `Added ${kind}: ${input.key} = ${Array.isArray(input.value) ? input.value.join(", ") : String(input.value)}`)],
    };
  });
  return interviewState(updated);
}

/* -------------------------------------------------------------------------- */
/* Diagnosis & hypotheses                                                      */
/* -------------------------------------------------------------------------- */

export async function diagnose(auth: AuthContext, caseId: string, override: boolean) {
  const c = await loadCase(auth, caseId);
  const r = readiness(c);
  if (!r.ready && !override) {
    throw new HttpError(409, "Discovery is not complete enough for a reliable diagnosis.", "NOT_READY", r);
  }
  const raw = await withAi(auth, c, "diagnose", (deps) => agents.runDiagnosis(deps, c));
  // Deterministic evidence check: "fact" labels without a confirmed source are downgraded.
  const diagnosis = { ...raw, findings: raw.findings.map((f) => ({ ...f, evidence: verifyEvidence(c, f.evidence).items })) };
  if (!r.ready) {
    await decision(auth, caseId, {
      decision: "Proceeded to diagnosis with incomplete discovery",
      reason: `${r.missingCritical.length} critical question(s) unanswered; coverage ${Math.round(r.coverage * 100)}%`,
      evidence: r.missingCritical.map((m) => m.prompt),
      impact: "Diagnosis confidence is reduced",
    });
  }
  const updated = await mutate(auth, caseId, (cur) => {
    const assumptions: Assumption[] = diagnosis.assumptions.map((a) => ({ ...a, id: id("asm") }));
    return clearPending({
      ...cur,
      diagnosis,
      dataGaps: diagnosis.dataGaps,
      assumptions,
      analysisStale: false,
      status: cur.status === "draft" || cur.status === "discovery" ? "discovery" : cur.status,
      transcript: [...cur.transcript, entry("consultant", "message", `Diagnosis (confidence ${Math.round(diagnosis.confidence * 100)}%): ${diagnosis.summary}`)],
    });
  });
  return withDerived(updated);
}

export async function generateHypotheses(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  if (!c.diagnosis) throw new HttpError(409, "Run the diagnosis before generating hypotheses.", "NO_DIAGNOSIS");
  const fresh = (await withAi(auth, c, "hypotheses", (deps) => agents.generateHypotheses(deps, c))).map((h) => withAssessment(c, h));
  let updated = await mutate(auth, caseId, (cur) => {
    // Keep reviewed hypotheses (including rejections, which inform future runs).
    const reviewed = cur.hypotheses.filter((h) => h.status !== "proposed");
    return clearPending({
      ...cur,
      hypotheses: [...reviewed, ...fresh],
      debateStatus: "pending",
      status: "validation",
      transcript: [...cur.transcript, entry("consultant", "decision", "Here is what I believe is happening. Please review each hypothesis before I build the strategy.")],
    });
  });
  updated = await snapshot(auth, updated, "Hypotheses generated");
  // The debate panel stress-tests the new hypotheses after the response is sent.
  await inBackground("hypotheses.debate", () => runDebate(auth, caseId, fresh.map((h) => h.id)));
  if (process.env.VITEST) updated = await loadCase(auth, caseId);
  return withDerived(updated);
}

/**
 * Devil's-advocate debate. Challengers run on a second provider when one is
 * configured; results feed the rule-based confidence score.
 */
async function runDebate(auth: AuthContext, caseId: string, ids?: string[]) {
  const c = await loadCase(auth, caseId);
  const targets = c.hypotheses.filter((h) => h.status !== "disagreed" && (!ids || ids.includes(h.id)));
  if (!targets.length) return;
  const debater = auth.aiPreference ? auth : { ...auth, ...(await secondOpinion(auth.orgId).then((p) => (p ? { aiPreference: p } : {}))) };
  try {
    const debates = await withAi(debater, c, "debate", (deps) => agents.debateHypotheses(deps, c, targets), { flagPending: false });
    const model = (await getActivity(auth.orgId, caseId))?.model;
    await mutate(auth, caseId, (cur) => ({
      ...cur,
      debateStatus: "done",
      hypotheses: cur.hypotheses.map((h) => {
        const d = debates[h.id];
        if (!d) return h;
        return withAssessment(cur, { ...h, debate: { ...d, at: now(), ...(model ? { model } : {}) } });
      }),
    }));
  } catch (err) {
    log("warn", "hypotheses.debate_failed", { caseId, message: (err as Error).message });
    await mutate(auth, caseId, (cur) => ({ ...cur, debateStatus: "failed" }));
    throw err;
  }
}

/** Re-run the debate on demand (all hypotheses that are not rejected). */
export async function debate(auth: AuthContext, caseId: string) {
  await mutate(auth, caseId, (cur) => ({ ...cur, debateStatus: "pending" }));
  await runDebate(auth, caseId);
  return withDerived(await loadCase(auth, caseId));
}

export async function reviewHypothesis(auth: AuthContext, caseId: string, hypothesisId: string, input: z.infer<typeof ReviewSchema>) {
  const c = await loadCase(auth, caseId);
  const h = c.hypotheses.find((x) => x.id === hypothesisId);
  if (!h) throw notFound("Hypothesis");
  if ((input.action === "partially_agree" || input.action === "disagree") && !input.feedback?.trim()) {
    throw badRequest(input.action === "disagree" ? "What part of this hypothesis do you disagree with?" : "What would you change or add?");
  }
  if (input.action === "edit" && !input.statement) throw badRequest("Provide the edited hypothesis statement");

  let revised: Hypothesis = { ...h, reviewedBy: auth.uid, reviewedAt: now() };
  let followUps: Question[] = [];
  switch (input.action) {
    case "agree":
      revised.status = "agreed";
      break;
    case "edit":
      revised = { ...revised, statement: input.statement!, status: "agreed", editedByUser: true, ...(input.feedback ? { userFeedback: input.feedback } : {}) };
      break;
    case "disagree":
      revised = { ...revised, status: "disagreed", userFeedback: input.feedback };
      break;
    case "partially_agree": {
      revised = { ...revised, status: "partially_agreed", userFeedback: input.feedback };
      try {
        const out = await withAi(auth, c, "refine_hypothesis", (deps) => agents.refineHypothesis(deps, c, h, input.feedback!));
        revised = { ...out.revised, status: "partially_agreed", userFeedback: input.feedback, reviewedBy: auth.uid, reviewedAt: now() };
        followUps = out.clarifyingQuestions.map((text, i) => ({
          id: `clar-${h.id}-${i}`,
          key: `performance.ai_clarify_${h.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}_${i}`,
          stage: "diagnosis",
          category: "PERFORMANCE",
          prompt: text,
          why: `Resolves your partial disagreement with: "${h.statement.slice(0, 120)}"`,
          input: "longtext",
          businessImpact: 4,
          diagnosticValue: 5,
          decisionRelevance: 5,
          critical: false,
          origin: "ai",
        }));
      } catch (err) {
        // Feedback is still recorded even if refinement is unavailable.
        if (!(err instanceof AIUnavailableError) && !(err instanceof HttpError)) throw err;
      }
      break;
    }
  }

  // A reworded hypothesis needs a fresh debate; the evidence score is always recomputed.
  if (revised.statement !== h.statement) {
    const { debate: _stale, ...rest } = revised;
    void _stale;
    revised = rest as Hypothesis;
  } else if (h.debate && !revised.debate) {
    revised = { ...revised, debate: h.debate };
  }
  revised = withAssessment(c, revised);

  const updated = await mutate(auth, caseId, (cur) => ({
    ...cur,
    hypotheses: cur.hypotheses.map((x) => (x.id === hypothesisId ? revised : x)),
    adaptiveQuestions: [...cur.adaptiveQuestions, ...followUps.filter((q) => !cur.adaptiveQuestions.some((a) => a.id === q.id))],
    transcript: [
      ...cur.transcript,
      entry("user", "decision", `${labelFor(input.action)}: "${revised.statement}"${input.feedback ? ` — ${input.feedback}` : ""}`),
      ...(input.action === "disagree"
        ? [entry("consultant", "message", "Understood. I've recorded why you disagree and will exclude this explanation. Rebuild the diagnosis to incorporate your feedback.")]
        : []),
    ],
  }));
  await decision(auth, caseId, {
    decision: `${labelFor(input.action)} hypothesis`,
    reason: input.feedback ?? (input.action === "agree" ? "Consistent with user knowledge" : ""),
    evidence: h.evidence.map((e) => `[${e.kind}] ${e.statement}`),
    impact: `Hypothesis: ${revised.statement}`,
  });
  return withDerived(updated);
}

function labelFor(action: z.infer<typeof ReviewSchema>["action"]) {
  return { agree: "Agreed", partially_agree: "Partially agreed", disagree: "Disagreed", edit: "Edited" }[action];
}

export function approvalGate(c: Case): { open: boolean; reason?: string } {
  if (!c.hypotheses.length) return { open: false, reason: "No hypotheses yet." };
  const pending = c.hypotheses.filter((h) => h.status === "proposed");
  if (pending.length) return { open: false, reason: `${pending.length} hypothesis(es) still need your review.` };
  if (!c.hypotheses.some((h) => h.status === "agreed" || h.status === "partially_agreed")) {
    return { open: false, reason: "At least one hypothesis must be agreed. Rebuild the diagnosis with your feedback." };
  }
  return { open: true };
}

/* -------------------------------------------------------------------------- */
/* Strategy                                                                    */
/* -------------------------------------------------------------------------- */

export async function generateRecommendations(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  const gate = approvalGate(c);
  if (!gate.open) throw new HttpError(409, `Hypothesis approval required: ${gate.reason}`, "GATE_CLOSED");
  const recs = await withAi(auth, c, "recommendations", (deps) => agents.generateRecommendations(deps, c));
  let updated = await mutate(auth, caseId, (cur) =>
    clearPending({
      ...cur,
      recommendations: recs,
      status: "strategy",
      transcript: [...cur.transcript, entry("consultant", "message", `I've built ${recs.length} prioritised recommendations from the hypotheses you validated.`)],
    }),
  );
  await decision(auth, caseId, {
    decision: "Generated strategic recommendations",
    reason: "Hypotheses validated by user",
    evidence: c.hypotheses.filter((h) => h.status === "agreed" || h.status === "partially_agreed").map((h) => h.statement),
    impact: recs.map((r) => `${r.priority} ${r.title}`).join("; "),
  });
  updated = await snapshot(auth, updated, "Recommendations generated");
  return withDerived(updated);
}

export const RecommendationEditSchema = z.object({
  impactScore: z.number().min(1).max(5).optional(),
  effortScore: z.number().min(1).max(5).optional(),
  confidence: z.number().min(0).max(1).optional(),
  strategicFit: z.number().min(1).max(5).optional(),
  timeToValueWeeks: z.number().min(0).max(260).optional(),
  expectedLiftPct: z.number().min(0).max(100).optional(),
});

/** Users can challenge the AI's scoring; priority is recomputed deterministically. */
export async function updateRecommendation(auth: AuthContext, caseId: string, recId: string, input: z.infer<typeof RecommendationEditSchema>) {
  const updated = await mutate(auth, caseId, (c) => {
    if (!c.recommendations.some((r) => r.id === recId)) throw notFound("Recommendation");
    const recs = c.recommendations.map((r) => (r.id === recId ? { ...r, ...input } : r));
    return { ...c, recommendations: prioritize(recs) };
  });
  return withDerived(updated);
}

export async function generatePlan(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  if (!c.recommendations.length) throw new HttpError(409, "Generate recommendations first.", "NO_RECOMMENDATIONS");
  const [activation, measurement] = await withAi(auth, c, "plan", (deps) =>
    Promise.all([agents.generateActivation(deps, c), agents.generateMeasurement(deps, c)]),
  );
  const updated = await mutate(auth, caseId, (cur) =>
    clearPending({
      ...cur,
      customerJourney: activation.customerJourney,
      journeys: activation.journeys,
      measurement: measurement.measurement,
      experiments: measurement.experiments,
    }),
  );
  return withDerived(updated);
}

/* -------------------------------------------------------------------------- */
/* Economics                                                                   */
/* -------------------------------------------------------------------------- */

/** Pre-fill economics inputs from known facts; anything else is an assumption. */
export function economicsDefaults(c: Case, modelId?: string): { inputs: EconomicsInputs; provenance: Record<string, KnowledgeKind> } {
  const model = getEconomicsModel(modelId) ?? modelForProblem(c.problemTypes);
  const first = (keys: string[]) => keys.map((k) => getNumber(c.context, k)).find((v) => v !== undefined);
  const volume = first(model.volumeKeys);
  const value = first(model.valueKeys);
  const margin = getNumber(c.context, "economics.gross_margin_pct");
  const topLift = c.recommendations.find((r) => r.expectedLiftPct !== undefined)?.expectedLiftPct;
  const lifts = topLift !== undefined && topLift > 0
    ? { conservative: Math.max(1, Math.round(topLift / 2)), base: topLift, aggressive: Math.min(100, Math.round(topLift * 1.75)) }
    : model.lifts;
  return {
    inputs: {
      currency: c.currency,
      model: model.id,
      eligibleCustomers: volume ?? 0,
      averageAnnualValue: value ?? 0,
      grossMarginPct: margin ?? 0,
      investment: 0,
      monthlyRunCost: 0,
      scenarioLifts: lifts,
    },
    provenance: {
      eligibleCustomers: volume !== undefined ? "fact" : "assumption",
      averageAnnualValue: value !== undefined ? "fact" : "assumption",
      grossMarginPct: margin !== undefined ? "fact" : "assumption",
      investment: "assumption",
      monthlyRunCost: "assumption",
      scenarioLifts: "assumption",
    },
  };
}

export async function saveEconomics(auth: AuthContext, caseId: string, raw: unknown) {
  const inputs = EconomicsInputsSchema.parse(raw);
  const c = await loadCase(auth, caseId);
  const defaults = economicsDefaults(c, inputs.model);
  // An input is a fact only if it matches a user-provided fact in the case context.
  const provenance: Record<string, KnowledgeKind> = {
    eligibleCustomers: defaults.provenance.eligibleCustomers === "fact" && inputs.eligibleCustomers === defaults.inputs.eligibleCustomers ? "fact" : "assumption",
    averageAnnualValue: defaults.provenance.averageAnnualValue === "fact" && inputs.averageAnnualValue === defaults.inputs.averageAnnualValue ? "fact" : "assumption",
    grossMarginPct: defaults.provenance.grossMarginPct === "fact" && inputs.grossMarginPct === defaults.inputs.grossMarginPct ? "fact" : "assumption",
    investment: "assumption",
    monthlyRunCost: "assumption",
    scenarioLifts: "assumption",
  };
  const economics = computeEconomics(inputs, provenance);
  const updated = await mutate(auth, caseId, (cur) => ({ ...cur, economics, currency: inputs.currency }));
  return withDerived(updated);
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

export async function generateReport(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  if (!c.recommendations.length) throw new HttpError(409, "Generate recommendations before the report.", "NO_RECOMMENDATIONS");
  const report = await withAi(auth, c, "report", (deps) => agents.generateReport(deps, c));
  let updated = await mutate(auth, caseId, (cur) =>
    clearPending({
      ...cur,
      report,
      status: "completed",
      transcript: [...cur.transcript, entry("consultant", "message", "Your strategy is ready.")],
    }),
  );
  updated = await snapshot(auth, updated, "Report generated");
  return withDerived(updated);
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export async function listHistory(auth: AuthContext, caseId: string) {
  await loadCase(auth, caseId);
  const where: [string, "==", string][] = [["organizationId", "==", auth.orgId], ["caseId", "==", caseId]];
  const [versions, decisions] = await Promise.all([
    getStore().collection<CaseVersion>("case_versions").query({ where, orderBy: { field: "createdAt", direction: "desc" }, limit: 50 }),
    getStore().collection<DecisionLogEntry>("decision_logs").query({ where, orderBy: { field: "createdAt", direction: "desc" }, limit: 200 }),
  ]);
  return {
    versions: versions.map((v) => ({ id: v.id, version: v.version, label: v.label, createdAt: v.createdAt, createdBy: v.createdBy })),
    decisions,
  };
}

export async function compareVersions(auth: AuthContext, caseId: string, a: string, b: string) {
  await loadCase(auth, caseId);
  const col = getStore().collection<CaseVersion>("case_versions");
  const [va, vb] = await Promise.all([col.get(a), col.get(b)]);
  for (const v of [va, vb]) if (!v || v.organizationId !== auth.orgId || v.caseId !== caseId) throw notFound("Version");
  return diffVersions(va!, vb!);
}

/** Full case export for data portability (spec §61). */
export async function exportCaseData(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  const history = await listHistory(auth, caseId);
  return { exportedAt: now(), case: c, decisions: history.decisions, versions: history.versions };
}

/* -------------------------------------------------------------------------- */
/* Shared data                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_DATASETS = 10;

export const DatasetInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["table", "text"]),
  /** Already masked in the browser; masked again here as a safety net. */
  content: z.string().min(1).max(3_000_000),
  note: z.string().trim().max(500).optional(),
  maskedColumns: z.array(z.string().max(200)).max(200).default([]),
  removedColumns: z.array(z.string().max(200)).max(200).default([]),
  /** Columns the user confirmed are not personal (only honoured for name-based flags). */
  keptColumns: z.array(z.string().max(200)).max(200).default([]),
});

/**
 * Store a shared dataset as a compact, PII-masked profile (column stats and a
 * short sample). The raw file is never persisted.
 */
export async function addDataset(auth: AuthContext, caseId: string, input: z.infer<typeof DatasetInputSchema>) {
  const current = await loadCase(auth, caseId);
  if ((current.datasets?.length ?? 0) >= MAX_DATASETS) throw badRequest(`A case can hold up to ${MAX_DATASETS} datasets. Remove one first.`);
  const base = {
    id: id("ds"),
    name: input.name,
    ...(input.note ? { note: input.note } : {}),
    sizeBytes: Buffer.byteLength(input.content),
    createdAt: now(),
    createdBy: auth.uid,
  };
  let ds: Dataset;
  if (input.kind === "table") {
    let table = parseDelimited(input.content);
    if (!table.headers.length || !table.rows.length) throw badRequest("The file has no data rows. Check that the first row contains column names.");
    // Server-side safety net: anything that still looks personal is pseudonymised.
    const kept = new Set(input.keptColumns);
    const leftover = detectPiiColumns(table).filter((p) => !(kept.has(p.name) && p.reason.startsWith("column name")));
    if (leftover.length) table = maskColumns(table, leftover.map((p) => p.index), []);
    const profile = profileTable(table);
    const analyses = analyzeTable(table, input.name);
    ds = {
      ...base, kind: "table", rowCount: profile.rowCount, columns: profile.columns, sample: maskFreeText(profile.sample).text,
      ...(analyses.length ? { analyses } : {}),
      maskedColumns: [...new Set([...input.maskedColumns, ...leftover.map((p) => p.name)])], removedColumns: input.removedColumns,
    };
  } else {
    const masked = maskFreeText(input.content);
    ds = { ...base, kind: "text", excerpt: masked.text.slice(0, 8000), maskedColumns: [], removedColumns: [], maskedItems: masked.masked };
  }
  const updated = await mutate(auth, caseId, (c) => ({
    ...c,
    datasets: [...(c.datasets ?? []), ds],
    analysisStale: c.analysisStale || !!c.diagnosis,
    transcript: [
      ...c.transcript,
      entry("user", "message", ds.kind === "table" ? `Shared data: ${ds.name} (${ds.rowCount} rows, ${ds.columns?.length} columns)` : `Shared notes: ${ds.name}`),
      ...(ds.analyses?.length ? [entry("consultant", "message", `I analysed ${ds.name}: ${ds.analyses.map((a) => a.findings[0]).join(" ")}`)] : []),
    ].slice(-400),
  }));
  await audit(auth.orgId, auth.uid, "case.dataset.add", caseId, { dataset: ds.id, kind: ds.kind, masked: ds.maskedColumns.length });
  return withDerived(updated);
}

export async function removeDataset(auth: AuthContext, caseId: string, datasetId: string) {
  const updated = await mutate(auth, caseId, (c) => ({ ...c, datasets: (c.datasets ?? []).filter((d) => d.id !== datasetId) }));
  await audit(auth.orgId, auth.uid, "case.dataset.remove", caseId, { dataset: datasetId });
  return withDerived(updated);
}

/* -------------------------------------------------------------------------- */
/* Outcomes                                                                    */
/* -------------------------------------------------------------------------- */

export const OutcomeInputSchema = z.object({
  status: z.enum(["planned", "live", "completed", "dropped"]),
  actualLiftPct: z.number().min(-100).max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Record what a recommendation actually delivered (feeds calibration of future forecasts). */
export async function recordOutcome(auth: AuthContext, caseId: string, recommendationId: string, input: z.infer<typeof OutcomeInputSchema>) {
  const c = await loadCase(auth, caseId);
  const r = c.recommendations.find((x) => x.id === recommendationId);
  if (!r) throw notFound("Recommendation");
  if (input.status === "completed" && input.actualLiftPct === undefined) throw badRequest("Enter the measured lift to complete an initiative.");
  const outcome = {
    status: input.status,
    ...(input.actualLiftPct !== undefined ? { actualLiftPct: input.actualLiftPct } : {}),
    ...(r.expectedLiftPct !== undefined ? { forecastLiftPct: r.expectedLiftPct } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    recordedAt: now(),
    recordedBy: auth.uid,
  };
  const updated = await mutate(auth, caseId, (cur) => ({
    ...cur,
    recommendations: cur.recommendations.map((x) => (x.id === recommendationId ? { ...x, outcome } : x)),
    transcript: [...cur.transcript, entry("user", "decision", `Outcome for "${r.title}": ${input.status}${input.actualLiftPct !== undefined ? `, measured lift ${input.actualLiftPct}% (forecast ${r.expectedLiftPct ?? "n/a"}%)` : ""}`)].slice(-400),
  }));
  await audit(auth.orgId, auth.uid, "case.outcome", caseId, { recommendation: recommendationId, status: input.status });
  return withDerived(updated);
}
