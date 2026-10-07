import type { Case, ProblemType, Question, ScoredQuestion, Stage } from "@/domain/types";
import { STAGES } from "@/domain/types";
import { QUESTION_BANK, type BankQuestion } from "@/knowledge/questionBank";
import { isKnown, markUnknown } from "./context";
import { fillPlaceholders, metricFromStatement, vocabularyFor } from "@/knowledge/vocabulary";

/**
 * Information Value Engine (spec §8–9).
 *
 *   Priority = Business Impact × Diagnostic Value × Uncertainty × Decision Relevance
 *
 * with a boost when a question is especially diagnostic for the classified
 * problem type, and a boost for critical questions. Questions scoring below
 * MIN_PRIORITY are not worth the user's time and are never asked.
 */
export const MIN_PRIORITY = 20;
const PROBLEM_BOOST = 1.5;
const CRITICAL_BOOST = 1.25;

type InterviewCase = Pick<Case, "context" | "problemTypes" | "industryId" | "adaptiveQuestions"> & Partial<Pick<Case, "problemStatement" | "questionPlan">>;

export const STAGE_LABELS: Record<Stage, string> = {
  business: "Business Objective",
  diagnosis: "Diagnosis",
  customer: "Customer",
  data: "Data & Insights",
  technology: "Technology",
  activation: "Activation",
  measurement: "Measurement",
  economics: "Economics",
};

export function isRelevant(q: Question | BankQuestion, c: InterviewCase): boolean {
  const when = (q as BankQuestion).when;
  if (!when) return true;
  // An unclassified problem keeps every lens open rather than guessing.
  if (when.problemTypes && c.problemTypes.length && !when.problemTypes.some((t) => c.problemTypes.includes(t))) {
    return false;
  }
  if (when.industries && (!c.industryId || !when.industries.includes(c.industryId))) {
    return false;
  }
  if (when.requiresKnown && !when.requiresKnown.every((k) => isKnown(c.context, k))) {
    return false;
  }
  return true;
}

/** 1 = unknown, 0.5 = only an assumption/inference, 0 = known fact or declared unknown. */
export function uncertainty(q: Question, c: InterviewCase): number {
  if (c.context.unknownKeys.includes(q.key)) return 0;
  const f = c.context.fields[q.key];
  if (!f || !isKnown(c.context, q.key)) return 1;
  return f.kind === "fact" ? 0 : 0.5;
}

export function scoreQuestion(q: Question | BankQuestion, c: InterviewCase): ScoredQuestion {
  const u = uncertainty(q, c);
  let priority = q.businessImpact * q.diagnosticValue * u * q.decisionRelevance;
  const boostFor = (q as BankQuestion).boostFor;
  if (boostFor && boostFor.some((t: ProblemType) => c.problemTypes.includes(t))) priority *= PROBLEM_BOOST;
  if (q.critical) priority *= CRITICAL_BOOST;
  return { ...contextualize(stripRules(q), c), priority: Math.round(priority * 10) / 10, uncertainty: u };
}

/**
 * Phrase a question in the case's own terms: the planner's tailored wording
 * when available, otherwise industry vocabulary and the metric from the
 * problem statement. Inferred answers are offered for confirmation.
 */
function contextualize(q: Question, c: InterviewCase): Question & { suggested?: ScoredQuestion["suggested"] } {
  const plan = c.questionPlan?.items[q.id];
  const metric = c.questionPlan?.metric || (c.problemStatement ? metricFromStatement(c.problemStatement) : undefined);
  const v = vocabularyFor(c.industryId);
  let prompt = plan?.prompt || fillPlaceholders(q.prompt, v, metric);
  const why = plan?.why || fillPlaceholders(q.why, v, metric);
  const f = c.context.fields[q.key];
  const inferred = f && f.kind !== "fact" && !c.context.unknownKeys.includes(q.key) ? f.value : undefined;
  let suggested: ScoredQuestion["suggested"];
  if (inferred !== undefined && (q.input === "select" || q.input === "multiselect")) {
    const vals = (Array.isArray(inferred) ? inferred : [inferred]).map(String).filter((x) => q.options?.includes(x));
    if (vals.length) {
      suggested = q.input === "select" ? vals[0] : vals;
      prompt = `${prompt} I think it's ${vals.join(", ")}. Is that right?`;
    }
  }
  return { ...q, prompt, why, ...(suggested !== undefined ? { suggested } : {}) };
}

function stripRules(q: Question | BankQuestion): Question {
  const { when: _w, boostFor: _b, ...rest } = q as BankQuestion;
  void _w;
  void _b;
  return rest;
}

export function candidateQuestions(c: InterviewCase): (Question | BankQuestion)[] {
  const plan = c.questionPlan?.status === "ready" ? c.questionPlan.items : undefined;
  const bank = QUESTION_BANK.filter((q) => isRelevant(q, c) && !plan?.[q.id]?.skip);
  const seen = new Set(bank.map((q) => q.key));
  const adaptive = c.adaptiveQuestions.filter((q) => !seen.has(q.key));
  return [...bank, ...adaptive];
}

/** The highest information-value questions to ask next. */
export function nextQuestions(c: InterviewCase, limit = 3): ScoredQuestion[] {
  return candidateQuestions(c)
    .map((q) => scoreQuestion(q, c))
    .filter((q) => q.priority >= MIN_PRIORITY)
    // Equal value: understand the business and the problem before tools and economics.
    .sort((a, b) => b.priority - a.priority || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
    .slice(0, limit);
}

export interface StageCoverage {
  stage: Stage;
  label: string;
  /** 0–1 share of relevant information value already captured. */
  coverage: number;
  known: number;
  relevant: number;
  remainingHighValue: number;
  sufficient: boolean;
}

export function stageCoverage(c: InterviewCase): StageCoverage[] {
  const qs = candidateQuestions(c);
  return STAGES.map((stage) => {
    const inStage = qs.filter((q) => q.stage === stage);
    const weight = (q: Question) => q.businessImpact * q.diagnosticValue * q.decisionRelevance;
    const total = inStage.reduce((s, q) => s + weight(q), 0);
    const captured = inStage.reduce((s, q) => s + weight(q) * (1 - uncertainty(q, c)), 0);
    const remainingHighValue = inStage.filter((q) => scoreQuestion(q, c).priority >= MIN_PRIORITY).length;
    const known = inStage.filter((q) => uncertainty(q, c) < 1).length;
    return {
      stage,
      label: STAGE_LABELS[stage],
      coverage: total ? captured / total : 1,
      known,
      relevant: inStage.length,
      remainingHighValue,
      sufficient: inStage.length > 0 && known > 0 && remainingHighValue === 0,
    };
  });
}

/** Explicit "I have enough information on X" statements (spec §9). */
export function sufficiencyStatements(c: InterviewCase): string[] {
  return stageCoverage(c)
    .filter((s) => s.sufficient)
    .map((s) => `I have enough information on ${s.label.toLowerCase()}. I don't need additional questions here.`);
}

export interface Readiness {
  ready: boolean;
  criticalAnswered: number;
  criticalTotal: number;
  coverage: number;
  missingCritical: { id: string; prompt: string }[];
}

/**
 * Discovery is ready for hypothesis generation once every critical question
 * is answered (or explicitly declared unknown) and at least half of the
 * relevant information value has been captured.
 */
export function readiness(c: InterviewCase): Readiness {
  const qs = candidateQuestions(c);
  const critical = qs.filter((q) => q.critical);
  const missingCritical = critical
    .filter((q) => uncertainty(q, c) === 1)
    .map((q) => ({ id: q.id, prompt: q.prompt }));
  const weight = (q: Question) => q.businessImpact * q.diagnosticValue * q.decisionRelevance;
  const total = qs.reduce((s, q) => s + weight(q), 0);
  const captured = qs.reduce((s, q) => s + weight(q) * (1 - uncertainty(q, c)), 0);
  const coverage = total ? captured / total : 0;
  return {
    ready: missingCritical.length === 0 && coverage >= 0.5,
    criticalAnswered: critical.length - missingCritical.length,
    criticalTotal: critical.length,
    coverage: Math.round(coverage * 100) / 100,
    missingCritical,
  };
}

/**
 * Roughly how many more questions until discovery is ready, assuming the user
 * keeps answering the top-ranked question. Used for the "Question 3 of ~12"
 * counter, so the target stays honest without counting optional extras.
 */
export function questionsToReady(c: InterviewCase, cap = 80): number {
  let sim = c;
  for (let n = 0; n < cap; n++) {
    if (readiness(sim).ready) return n;
    const q = nextQuestions(sim, 1)[0];
    if (!q) return n;
    sim = { ...sim, context: markUnknown(sim.context, q.key) };
  }
  return cap;
}

export function findQuestion(c: InterviewCase, id: string): Question | undefined {
  const q = candidateQuestions(c).find((x) => x.id === id);
  return q ? contextualize(stripRules(q), c) : undefined;
}
