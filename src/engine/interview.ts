import type { Case, ProblemType, Question, ScoredQuestion, Stage } from "@/domain/types";
import { STAGES } from "@/domain/types";
import { QUESTION_BANK, type BankQuestion } from "@/knowledge/questionBank";
import { isKnown } from "./context";

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

type InterviewCase = Pick<Case, "context" | "problemTypes" | "industryId" | "adaptiveQuestions">;

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
  if (when.problemTypes && !when.problemTypes.some((t) => c.problemTypes.includes(t))) {
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
  return { ...stripRules(q), priority: Math.round(priority * 10) / 10, uncertainty: u };
}

function stripRules(q: Question | BankQuestion): Question {
  const { when: _w, boostFor: _b, ...rest } = q as BankQuestion;
  void _w;
  void _b;
  return rest;
}

export function candidateQuestions(c: InterviewCase): (Question | BankQuestion)[] {
  const bank = QUESTION_BANK.filter((q) => isRelevant(q, c));
  const seen = new Set(bank.map((q) => q.key));
  const adaptive = c.adaptiveQuestions.filter((q) => !seen.has(q.key));
  return [...bank, ...adaptive];
}

/** The highest information-value questions to ask next. */
export function nextQuestions(c: InterviewCase, limit = 3): ScoredQuestion[] {
  return candidateQuestions(c)
    .map((q) => scoreQuestion(q, c))
    .filter((q) => q.priority >= MIN_PRIORITY)
    .sort((a, b) => b.priority - a.priority)
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

export function findQuestion(c: InterviewCase, id: string): Question | undefined {
  const q = candidateQuestions(c).find((x) => x.id === id);
  return q ? stripRules(q) : undefined;
}
