import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Framework vocabulary                                                        */
/* -------------------------------------------------------------------------- */

/** B-D-C-D-T-A-M-E strategic framework stages. */
export const STAGES = [
  "business",
  "diagnosis",
  "customer",
  "data",
  "technology",
  "activation",
  "measurement",
  "economics",
] as const;
export const StageSchema = z.enum(STAGES);
export type Stage = z.infer<typeof StageSchema>;

/** Question classification used by the Information Value Engine. */
export const QUESTION_CATEGORIES = [
  "BUSINESS",
  "CUSTOMER",
  "MARKETING",
  "DATA",
  "TECHNOLOGY",
  "PERFORMANCE",
  "ECONOMICS",
  "OPERATIONS",
  "COMPETITION",
  "EXPERIENCE",
] as const;
export const QuestionCategorySchema = z.enum(QUESTION_CATEGORIES);
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;

export const PROBLEM_TYPES = [
  "retention",
  "acquisition",
  "conversion",
  "activation",
  "engagement",
  "winback",
  "loyalty",
  "personalization",
  "crm",
  "martech",
  "monetization",
  "brand",
  "pricing",
  "pipeline",
  "paid_media",
  "seo_content",
  "measurement",
  "advocacy",
  "app_growth",
] as const;
export const ProblemTypeSchema = z.enum(PROBLEM_TYPES);
export type ProblemType = z.infer<typeof ProblemTypeSchema>;

/* -------------------------------------------------------------------------- */
/* Guardrails: every statement carries its epistemic status                    */
/* -------------------------------------------------------------------------- */

/**
 * fact        – provided by the user or verified data
 * inference   – derived by the AI from available evidence
 * assumption  – required because information is missing
 */
export const KnowledgeKindSchema = z.enum(["fact", "inference", "assumption"]);
export type KnowledgeKind = z.infer<typeof KnowledgeKindSchema>;

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ImpactSchema = z.enum(["high", "medium", "low"]);
export type Impact = z.infer<typeof ImpactSchema>;

/* -------------------------------------------------------------------------- */
/* Case context                                                                */
/* -------------------------------------------------------------------------- */

export const FieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type FieldValue = z.infer<typeof FieldValueSchema>;

export const ContextFieldSchema = z.object({
  /** Dotted key, e.g. "performance.retention_current". */
  key: z.string(),
  stage: StageSchema,
  value: FieldValueSchema,
  kind: KnowledgeKindSchema,
  source: z.enum(["user", "document", "ai_extraction", "ai_inference"]),
  confidence: ConfidenceLevelSchema,
  questionId: z.string().optional(),
  /** Raw note the user attached to the answer. */
  note: z.string().optional(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type ContextField = z.infer<typeof ContextFieldSchema>;

export const CaseContextSchema = z.object({
  fields: z.record(z.string(), ContextFieldSchema),
  /** Questions the user explicitly said they cannot answer. */
  unknownKeys: z.array(z.string()),
  notes: z.string(),
});
export type CaseContext = z.infer<typeof CaseContextSchema>;

/* -------------------------------------------------------------------------- */
/* Questions                                                                   */
/* -------------------------------------------------------------------------- */

export const InputTypeSchema = z.enum([
  "text",
  "longtext",
  "number",
  "percent",
  "currency",
  "select",
  "multiselect",
  "boolean",
]);
export type InputType = z.infer<typeof InputTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  /** Context key this question fills. */
  key: z.string(),
  stage: StageSchema,
  category: QuestionCategorySchema,
  prompt: z.string(),
  /** "Why am I asking this?" transparency text. */
  why: z.string(),
  input: InputTypeSchema,
  options: z.array(z.string()).optional(),
  /** Optional visual grouping of `options` (e.g. martech vendors by category). */
  groups: z.array(z.object({ label: z.string(), options: z.array(z.string()) })).optional(),
  placeholder: z.string().optional(),
  unit: z.string().optional(),
  /** 1–5 scores feeding the Information Value Engine. */
  businessImpact: z.number().min(1).max(5),
  diagnosticValue: z.number().min(1).max(5),
  decisionRelevance: z.number().min(1).max(5),
  /** Critical questions gate hypothesis generation. */
  critical: z.boolean().default(false),
  origin: z.enum(["bank", "ai"]).default("bank"),
});
export type Question = z.infer<typeof QuestionSchema>;

export const ScoredQuestionSchema = QuestionSchema.extend({
  priority: z.number(),
  uncertainty: z.number(),
  /** A value Pilot inferred and wants confirmed (pre-selected in the UI). */
  suggested: FieldValueSchema.optional(),
});

/** Data the user shared (CSV/TSV/text). Only a masked profile and sample are kept, never the raw file. */
export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string().max(120),
  kind: z.enum(["table", "text"]),
  note: z.string().max(500).optional(),
  sizeBytes: z.number(),
  createdAt: z.string(),
  createdBy: z.string(),
  rowCount: z.number().optional(),
  columns: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["number", "date", "text"]),
        filled: z.number(),
        distinct: z.number(),
        min: z.union([z.number(), z.string()]).optional(),
        max: z.union([z.number(), z.string()]).optional(),
        mean: z.number().optional(),
        sum: z.number().optional(),
        top: z.array(z.object({ value: z.string(), count: z.number() })).optional(),
      }),
    )
    .optional(),
  sample: z.string().max(4000).optional(),
  excerpt: z.string().max(8000).optional(),
  maskedColumns: z.array(z.string()),
  removedColumns: z.array(z.string()),
  maskedItems: z.number().optional(),
});
export type Dataset = z.infer<typeof DatasetSchema>;

/**
 * Per-case interview plan written by the Interview Planner agent: which bank
 * questions matter for THIS problem, and how to phrase them in its context.
 */
export const QuestionPlanSchema = z.object({
  status: z.enum(["pending", "ready", "failed"]),
  /** What the interview is really about, in one sentence. */
  focus: z.string().max(400).optional(),
  /** The metric under investigation, in the client's words (e.g. "repeat bookings"). */
  metric: z.string().max(80).optional(),
  items: z.record(z.string(), z.object({ prompt: z.string().max(300).optional(), why: z.string().max(400).optional(), skip: z.boolean().optional() })),
  updatedAt: z.string(),
});
export type QuestionPlan = z.infer<typeof QuestionPlanSchema>;
export type ScoredQuestion = z.infer<typeof ScoredQuestionSchema>;

export const TranscriptEntrySchema = z.object({
  id: z.string(),
  role: z.enum(["consultant", "user", "system"]),
  kind: z.enum(["question", "answer", "message", "sufficiency", "decision"]),
  text: z.string(),
  questionId: z.string().optional(),
  createdAt: z.string(),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

/* -------------------------------------------------------------------------- */
/* Evidence, assumptions, data gaps                                            */
/* -------------------------------------------------------------------------- */

export const EvidenceItemSchema = z.object({
  statement: z.string(),
  kind: KnowledgeKindSchema,
  /** Context keys this evidence is grounded in. */
  sourceKeys: z.array(z.string()).default([]),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const AssumptionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  impact: ImpactSchema,
  confidence: ConfidenceLevelSchema,
  validate: z.boolean(),
  howToValidate: z.string().optional(),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const DataGapSchema = z.object({
  dataset: z.string(),
  whyNeeded: z.string(),
  expectedInsight: z.string(),
  priority: ImpactSchema,
  alternativeProxy: z.string(),
});
export type DataGap = z.infer<typeof DataGapSchema>;

/* -------------------------------------------------------------------------- */
/* Diagnosis & hypotheses                                                      */
/* -------------------------------------------------------------------------- */

export const FindingSchema = z.object({
  finding: z.string(),
  stage: StageSchema,
  evidence: z.array(EvidenceItemSchema),
  confidence: z.number().min(0).max(1),
  impact: ImpactSchema,
});
export type Finding = z.infer<typeof FindingSchema>;

export const DiagnosisSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
  confidence: z.number().min(0).max(1),
  highConfidence: z.array(z.string()),
  mediumConfidence: z.array(z.string()),
  lowConfidence: z.array(z.string()),
  dataGaps: z.array(DataGapSchema),
  assumptions: z.array(AssumptionSchema.omit({ id: true })),
  generatedAt: z.string(),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export const HypothesisStatusSchema = z.enum([
  "proposed",
  "agreed",
  "partially_agreed",
  "disagreed",
]);
export type HypothesisStatus = z.infer<typeof HypothesisStatusSchema>;

export const HypothesisSchema = z.object({
  id: z.string(),
  statement: z.string(),
  driver: z.string(),
  evidence: z.array(EvidenceItemSchema),
  missingEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  businessImpact: ImpactSchema,
  status: HypothesisStatusSchema,
  /** User feedback captured at the approval gate. */
  userFeedback: z.string().optional(),
  clarifyingQuestions: z.array(z.string()).default([]),
  editedByUser: z.boolean().default(false),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

export const PrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  why: z.string(),
  problemAddressed: z.string(),
  hypothesisIds: z.array(z.string()),
  targetCustomer: z.string(),
  expectedImpact: z.string(),
  requiredData: z.array(z.string()),
  requiredTechnology: z.array(z.string()),
  activation: z.array(z.string()),
  measurement: z.array(z.string()),
  cost: z.enum(["low", "medium", "high"]),
  complexity: z.enum(["low", "medium", "high"]),
  timeToValueWeeks: z.number().min(0),
  dependencies: z.array(z.string()),
  risks: z.array(z.string()),
  /** Inputs to the prioritisation matrix. */
  impactScore: z.number().min(1).max(5),
  effortScore: z.number().min(1).max(5),
  confidence: z.number().min(0).max(1),
  strategicFit: z.number().min(1).max(5),
  /** Directional lift assumption used by the economics engine. */
  expectedLiftPct: z.number().min(0).max(100).optional(),
  priorityScore: z.number(),
  priority: PrioritySchema,
  evidence: z.array(EvidenceItemSchema),
  assumptions: z.array(z.string()),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

/* -------------------------------------------------------------------------- */
/* Activation, journeys, measurement, experiments                              */
/* -------------------------------------------------------------------------- */

export const JourneyStageSchema = z.object({
  stage: z.string(),
  customerNeed: z.string(),
  customerBehavior: z.string(),
  painPoint: z.string(),
  businessObjective: z.string(),
  data: z.array(z.string()),
  trigger: z.string(),
  activation: z.string(),
  technology: z.array(z.string()),
  kpi: z.string(),
});
export type JourneyStage = z.infer<typeof JourneyStageSchema>;

export const ActivationStepSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "wait", "condition", "action", "channel", "measure"]),
  label: z.string(),
  /** For conditions: labels of the yes/no branches. */
  branches: z.array(z.object({ label: z.string(), next: z.string() })).optional(),
});
export type ActivationStep = z.infer<typeof ActivationStepSchema>;

export const ActivationJourneySchema = z.object({
  id: z.string(),
  name: z.string(),
  recommendationId: z.string().optional(),
  objective: z.string(),
  audience: z.string(),
  channels: z.array(z.string()),
  steps: z.array(ActivationStepSchema),
  controlGroup: z.string(),
});
export type ActivationJourney = z.infer<typeof ActivationJourneySchema>;

export const KpiSchema = z.object({
  name: z.string(),
  definition: z.string(),
  level: z.enum(["business", "customer", "marketing", "channel", "operational"]),
  type: z.enum(["leading", "lagging"]),
  baseline: z.string().optional(),
  target: z.string().optional(),
});
export type Kpi = z.infer<typeof KpiSchema>;

export const MeasurementFrameworkSchema = z.object({
  northStar: z.string(),
  kpis: z.array(KpiSchema),
  attribution: z.string(),
  incrementality: z.string(),
});
export type MeasurementFramework = z.infer<typeof MeasurementFrameworkSchema>;

export const ExperimentSchema = z.object({
  id: z.string(),
  hypothesis: z.string(),
  audience: z.string(),
  control: z.string(),
  treatment: z.string(),
  primaryKpi: z.string(),
  secondaryKpis: z.array(z.string()),
  sampleSize: z.string(),
  duration: z.string(),
  expectedLift: z.string(),
  successCriteria: z.string(),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

/* -------------------------------------------------------------------------- */
/* Economics                                                                   */
/* -------------------------------------------------------------------------- */

export const EconomicsInputsSchema = z.object({
  currency: z.string().default("USD"),
  eligibleCustomers: z.number().min(0),
  averageAnnualValue: z.number().min(0),
  grossMarginPct: z.number().min(0).max(100),
  investment: z.number().min(0),
  monthlyRunCost: z.number().min(0),
  scenarioLifts: z.object({
    conservative: z.number().min(0).max(100),
    base: z.number().min(0).max(100),
    aggressive: z.number().min(0).max(100),
  }),
});
export type EconomicsInputs = z.infer<typeof EconomicsInputsSchema>;

export const ScenarioResultSchema = z.object({
  name: z.enum(["conservative", "base", "aggressive"]),
  liftPct: z.number(),
  customersImpacted: z.number(),
  incrementalRevenue: z.number(),
  incrementalGrossProfit: z.number(),
  programCost: z.number(),
  netProfit: z.number(),
  roi: z.number().nullable(),
  paybackMonths: z.number().nullable(),
});
export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

export const EconomicsSchema = z.object({
  inputs: EconomicsInputsSchema,
  scenarios: z.array(ScenarioResultSchema),
  /** Which inputs were user-supplied facts versus assumptions. */
  inputProvenance: z.record(z.string(), KnowledgeKindSchema),
  disclaimer: z.string(),
  calculatedAt: z.string(),
});
export type Economics = z.infer<typeof EconomicsSchema>;

/* -------------------------------------------------------------------------- */
/* Maturity                                                                    */
/* -------------------------------------------------------------------------- */

export const MaturityDimensionSchema = z.object({
  dimension: z.enum(["Data", "Technology", "Activation", "Analytics", "AI", "Operating Model"]),
  score: z.number().min(0).max(5),
  rationale: z.string(),
});
export type MaturityDimension = z.infer<typeof MaturityDimensionSchema>;

export const MaturitySchema = z.object({
  level: z.number().min(1).max(6),
  levelName: z.string(),
  dimensions: z.array(MaturityDimensionSchema),
  capabilityGaps: z.array(
    z.object({
      capability: z.string(),
      current: z.string(),
      gap: z.string(),
      recommendation: z.string(),
    }),
  ),
  basedOnFields: z.number(),
});
export type Maturity = z.infer<typeof MaturitySchema>;

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

export const ReportContentSchema = z.object({
  title: z.string(),
  executive: z.object({
    whatIsHappening: z.string(),
    whyItIsHappening: z.array(z.string()),
    whatWeShouldDo: z.array(z.string()),
    whatItWillDeliver: z.string(),
    whatHappensNext: z.object({
      days30: z.array(z.string()),
      days60: z.array(z.string()),
      days90: z.array(z.string()),
    }),
  }),
  keyFindings: z.array(z.string()),
  customerInsights: z.array(z.string()),
  dataAssessment: z.string(),
  technologyAssessment: z.string(),
  roadmap: z.array(
    z.object({
      horizon: z.enum(["0-30 days", "30-60 days", "60-90 days", "3-6 months", "6-12 months"]),
      theme: z.string(),
      initiatives: z.array(z.string()),
    }),
  ),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  dependencies: z.array(z.string()),
  nextSteps: z.array(z.string()),
  generatedAt: z.string(),
});
export type ReportContent = z.infer<typeof ReportContentSchema>;

/* -------------------------------------------------------------------------- */
/* Case                                                                        */
/* -------------------------------------------------------------------------- */

export const CaseStatusSchema = z.enum([
  "draft",
  "discovery",
  "validation",
  "strategy",
  "completed",
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const PendingOperationSchema = z.object({
  operation: z.string(),
  message: z.string(),
  failedAt: z.string(),
});

export const CaseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  name: z.string().min(1).max(200),
  problemStatement: z.string().min(1).max(10_000),
  status: CaseStatusSchema,
  progress: z.number().min(0).max(100),
  problemTypes: z.array(ProblemTypeSchema),
  industryId: z.string().optional(),
  currency: z.string(),
  context: CaseContextSchema,
  transcript: z.array(TranscriptEntrySchema),
  askedQuestionIds: z.array(z.string()),
  adaptiveQuestions: z.array(QuestionSchema),
  questionPlan: QuestionPlanSchema.optional(),
  datasets: z.array(DatasetSchema).optional(),
  selectedFrameworks: z.array(z.string()),
  diagnosis: DiagnosisSchema.optional(),
  hypotheses: z.array(HypothesisSchema),
  recommendations: z.array(RecommendationSchema),
  customerJourney: z.array(JourneyStageSchema),
  journeys: z.array(ActivationJourneySchema),
  measurement: MeasurementFrameworkSchema.optional(),
  experiments: z.array(ExperimentSchema),
  economics: EconomicsSchema.optional(),
  assumptions: z.array(AssumptionSchema),
  dataGaps: z.array(DataGapSchema),
  report: ReportContentSchema.optional(),
  /** Set when an AI operation failed so the user can resume. */
  pendingOperation: PendingOperationSchema.optional(),
  /** Context changed after analysis was produced; re-run is advised. */
  analysisStale: z.boolean(),
  /** Incremented on every major analysis snapshot. */
  analysisVersion: z.number().int().min(0),
  /** Optimistic concurrency revision. */
  revision: z.number().int().min(0),
});
export type Case = z.infer<typeof CaseSchema>;

export type CaseSummary = Pick<
  Case,
  | "id"
  | "name"
  | "status"
  | "progress"
  | "industryId"
  | "problemTypes"
  | "updatedAt"
  | "createdAt"
>;

/* -------------------------------------------------------------------------- */
/* Tenancy                                                                     */
/* -------------------------------------------------------------------------- */

export const ROLES = ["owner", "admin", "strategist", "analyst", "viewer"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const PlanSchema = z.enum(["free", "professional", "business", "enterprise"]);
export type Plan = z.infer<typeof PlanSchema>;

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  role: Role;
  /** Preferred mascot character (see components/mascot/registry); "none" hides it. */
  mascot?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionLogEntry {
  id: string;
  organizationId: string;
  caseId: string;
  decision: string;
  reason: string;
  evidence: string[];
  impact: string;
  createdBy: string;
  createdAt: string;
}

export interface CaseVersion {
  id: string;
  organizationId: string;
  caseId: string;
  version: number;
  label: string;
  createdBy: string;
  createdAt: string;
  snapshot: Pick<
    Case,
    | "context"
    | "diagnosis"
    | "hypotheses"
    | "recommendations"
    | "measurement"
    | "experiments"
    | "economics"
    | "report"
    | "status"
  >;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const BrandProfileSchema = z.object({
  companyName: z.string().max(120),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Body font (Word/PowerPoint/web). */
  fontFamily: z.string().max(60),
  /** Heading font; falls back to the body font. */
  headingFont: z.string().max(60).optional(),
  visualStyle: z.enum(["consulting", "minimal", "bold"]),
  tagline: z.string().max(160).optional(),
  /** Logo as a PNG data URL (resized client-side, max ~350 KB). */
  logoDataUrl: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Logo must be a PNG data URL")
    .max(480_000, "Logo is too large — use an image under ~350 KB")
    .optional(),
  logoWidth: z.number().int().min(1).max(4000).optional(),
  logoHeight: z.number().int().min(1).max(4000).optional(),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const DEFAULT_BRAND: BrandProfile = {
  companyName: "",
  primaryColor: "#0F2A4A",
  secondaryColor: "#2F6FDE",
  accentColor: "#E8A33D",
  fontFamily: "Calibri",
  headingFont: "Calibri",
  visualStyle: "consulting",
};
