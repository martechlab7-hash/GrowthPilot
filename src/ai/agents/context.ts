import type { Case, KnowledgeKind, Stage } from "@/domain/types";
import { formatValue } from "@/engine/context";
import { getIndustry } from "@/knowledge/industries";
import { getFramework } from "@/knowledge/frameworks";

interface ContextEntry {
  key: string;
  value: string;
  kind: KnowledgeKind;
  confidence: string;
  note?: string;
}

/** The structured context every agent receives (spec §51). */
export interface AgentContext {
  case_id: string;
  case_name: string;
  problem_statement: string;
  problem_types: string[];
  industry: {
    name: string;
    lifecycle: string[];
    kpis: string[];
    drivers: string[];
    economic_model: string;
  } | null;
  currency: string;
  business_context: ContextEntry[];
  diagnosis_context: ContextEntry[];
  customer_context: ContextEntry[];
  data_context: ContextEntry[];
  technology_context: ContextEntry[];
  marketing_context: ContextEntry[];
  measurement_context: ContextEntry[];
  economic_context: ContextEntry[];
  unknown_information: string[];
  user_notes: string;
  selected_frameworks: { name: string; answers: string }[];
  approved_hypotheses: { id: string; statement: string; user_feedback?: string }[];
  rejected_hypotheses: { statement: string; reason?: string }[];
  assumptions: string[];
  /** Data the client shared, as masked statistical profiles (treat as facts from their systems). */
  shared_data: {
    name: string;
    note?: string;
    rows?: number;
    columns?: string[];
    sample_csv?: string;
    text?: string;
    /** Results computed in code from the full file: verified facts (cite as "analysis:<name>"). */
    computed_analyses?: string[];
  }[];
}

const STAGE_BUCKET: Record<Stage, keyof AgentContext> = {
  business: "business_context",
  diagnosis: "diagnosis_context",
  customer: "customer_context",
  data: "data_context",
  technology: "technology_context",
  activation: "marketing_context",
  measurement: "measurement_context",
  economics: "economic_context",
};

export function buildAgentContext(c: Case): AgentContext {
  const industry = getIndustry(c.industryId);
  const ctx: AgentContext = {
    case_id: c.id,
    case_name: c.name,
    problem_statement: c.problemStatement,
    problem_types: c.problemTypes,
    industry: industry
      ? {
          name: industry.name,
          lifecycle: industry.lifecycle,
          kpis: industry.kpis,
          drivers: industry.drivers,
          economic_model: industry.economicModel,
        }
      : null,
    currency: c.currency,
    business_context: [],
    diagnosis_context: [],
    customer_context: [],
    data_context: [],
    technology_context: [],
    marketing_context: [],
    measurement_context: [],
    economic_context: [],
    unknown_information: c.context.unknownKeys,
    user_notes: c.context.notes,
    selected_frameworks: c.selectedFrameworks
      .map((id) => getFramework(id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ name: f.name, answers: f.answers })),
    approved_hypotheses: c.hypotheses
      .filter((h) => h.status === "agreed" || h.status === "partially_agreed")
      .map((h) => ({ id: h.id, statement: h.statement, ...(h.userFeedback ? { user_feedback: h.userFeedback } : {}) })),
    rejected_hypotheses: c.hypotheses
      .filter((h) => h.status === "disagreed")
      .map((h) => ({ statement: h.statement, ...(h.userFeedback ? { reason: h.userFeedback } : {}) })),
    assumptions: c.assumptions.map((a) => a.statement),
    shared_data: (c.datasets ?? []).map((d) => ({
      name: d.name,
      ...(d.note ? { note: d.note } : {}),
      ...(d.rowCount !== undefined ? { rows: d.rowCount } : {}),
      ...(d.columns
        ? {
            columns: d.columns.map((col) =>
              col.type === "number"
                ? `${col.name} (number: min ${col.min}, max ${col.max}, mean ${col.mean}, total ${col.sum})`
                : col.type === "date"
                  ? `${col.name} (date: ${col.min} to ${col.max})`
                  : `${col.name} (text, ${col.distinct} distinct${col.top?.length ? `; top: ${col.top.map((t) => `${t.value} ×${t.count}`).join(", ")}` : ""})`,
            ),
          }
        : {}),
      ...(d.sample ? { sample_csv: d.sample } : {}),
      ...(d.excerpt ? { text: d.excerpt.slice(0, 4000) } : {}),
      ...(d.analyses?.length ? { computed_analyses: d.analyses.flatMap((a) => a.findings.map((f) => `${a.title}: ${f}`)) } : {}),
    })),
  };
  for (const f of Object.values(c.context.fields)) {
    const bucket = ctx[STAGE_BUCKET[f.stage]] as ContextEntry[];
    bucket.push({
      key: f.key,
      value: formatValue(f.value),
      kind: f.kind,
      confidence: f.confidence,
      ...(f.note ? { note: f.note } : {}),
    });
  }
  return ctx;
}

export function serializeContext(ctx: AgentContext): string {
  return JSON.stringify(ctx, null, 1);
}
