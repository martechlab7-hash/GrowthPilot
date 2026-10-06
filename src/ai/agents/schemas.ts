import { z } from "zod";
import {
  ConfidenceLevelSchema,
  DataGapSchema,
  ExperimentSchema,
  FieldValueSchema,
  ImpactSchema,
  InputTypeSchema,
  JourneyStageSchema,
  KnowledgeKindSchema,
  KpiSchema,
  ProblemTypeSchema,
  QuestionCategorySchema,
  StageSchema,
} from "@/domain/types";

/** Agent output contracts. IDs, status and scores are assigned in code. */

const Evidence = z.object({
  statement: z.string(),
  kind: KnowledgeKindSchema,
  sourceKeys: z.array(z.string()).default([]),
});

export const ExtractionOutput = z.object({
  facts: z.array(
    z.object({
      key: z.string(),
      value: FieldValueSchema,
      confidence: ConfidenceLevelSchema,
    }),
  ),
  problemTypes: z.array(ProblemTypeSchema).default([]),
});

export const InterviewOutput = z.object({
  consultantNote: z.string(),
  followUps: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9_]{3,40}$/),
        prompt: z.string(),
        why: z.string(),
        stage: StageSchema,
        category: QuestionCategorySchema,
        input: InputTypeSchema,
        options: z.array(z.string()).optional(),
        businessImpact: z.number().min(1).max(5),
        diagnosticValue: z.number().min(1).max(5),
        decisionRelevance: z.number().min(1).max(5),
      }),
    )
    .max(3),
});

export const DiagnosticOutput = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      finding: z.string(),
      stage: StageSchema,
      evidence: z.array(Evidence),
      confidence: z.number().min(0).max(1),
      impact: ImpactSchema,
    }),
  ),
  confidence: z.number().min(0).max(1),
  highConfidence: z.array(z.string()),
  mediumConfidence: z.array(z.string()),
  lowConfidence: z.array(z.string()),
  dataGaps: z.array(DataGapSchema),
  assumptions: z.array(
    z.object({
      statement: z.string(),
      impact: ImpactSchema,
      confidence: ConfidenceLevelSchema,
      validate: z.boolean(),
      howToValidate: z.string().optional(),
    }),
  ),
});

const HypothesisDraft = z.object({
  statement: z.string(),
  driver: z.string(),
  evidence: z.array(Evidence),
  missingEvidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  businessImpact: ImpactSchema,
});

export const HypothesisOutput = z.object({
  hypotheses: z.array(HypothesisDraft).min(1).max(6),
});

export const RefineOutput = z.object({
  revised: HypothesisDraft,
  clarifyingQuestions: z.array(z.string()).max(4),
});

export const RecommendationOutput = z.object({
  recommendations: z
    .array(
      z.object({
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
        impactScore: z.number().min(1).max(5),
        effortScore: z.number().min(1).max(5),
        confidence: z.number().min(0).max(1),
        strategicFit: z.number().min(1).max(5),
        expectedLiftPct: z.number().min(0).max(100).optional(),
        evidence: z.array(Evidence),
        assumptions: z.array(z.string()),
      }),
    )
    .min(1)
    .max(8),
});

export const ActivationOutput = z.object({
  customerJourney: z.array(JourneyStageSchema).min(3).max(10),
  journeys: z
    .array(
      z.object({
        name: z.string(),
        recommendationId: z.string().optional(),
        objective: z.string(),
        audience: z.string(),
        channels: z.array(z.string()),
        controlGroup: z.string(),
        steps: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum(["trigger", "wait", "condition", "action", "channel", "measure"]),
              label: z.string(),
              branches: z.array(z.object({ label: z.string(), next: z.string() })).optional(),
            }),
          )
          .min(2)
          .max(16),
      }),
    )
    .min(1)
    .max(4),
});

export const MeasurementOutput = z.object({
  northStar: z.string(),
  kpis: z.array(KpiSchema).min(3).max(15),
  attribution: z.string(),
  incrementality: z.string(),
  experiments: z.array(ExperimentSchema.omit({ id: true })).min(1).max(5),
});

export const ReportOutput = z.object({
  executive: z.object({
    whatIsHappening: z.string(),
    whyItIsHappening: z.array(z.string()).max(3),
    whatWeShouldDo: z.array(z.string()).max(5),
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
});
