import type { Case, KnowledgeKind, Stage } from "@/domain/types";
import { formatValue } from "@/engine/context";
import { analyzeCadence } from "@/engine/cadence";
import { approachFor, channelOf, goalOf } from "@/engine/caseProfile";
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
  /** "decline", "growth" or "both" (recover then grow); null when not yet known. */
  case_goal: string | null;
  /** "offline", "online" or "omni"; null when not yet known. */
  sales_channel: string | null;
  /** How to approach this case given its goal and sales channel. Follow it. */
  approach: string[];
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
  /** Real messages, pages and the contact calendar the client shared, reviewed by Pilot. */
  communications?: {
    /** Computed in code from the calendar rows: facts about the client's own cadence. */
    cadence_analysis?: string[];
    screenshots?: { channel?: string; summary: string; cta?: string; offer?: string; personalisation?: string; issues: string[] }[];
    screenshots_overall?: string;
    pages?: { url: string; title?: string; read_from_html?: string; summary?: string; issues?: string[] }[];
  };
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
    case_goal: goalOf(c.context) ?? null,
    sales_channel: channelOf(c.context) ?? null,
    approach: approachFor(goalOf(c.context), channelOf(c.context)),
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
  const comms = communications(c);
  if (comms) ctx.communications = comms;
  for (const f of Object.values(c.context.fields)) {
    const bucket = ctx[STAGE_BUCKET[f.stage]] as ContextEntry[];
    bucket.push({
      key: f.key,
      value:
        f.key === "marketing.comm_screenshots" && Array.isArray(f.value)
          ? `${f.value.length} screenshot(s) shared (see communications)`
          : f.key === "marketing.cadence" && Array.isArray(f.value)
            ? f.value.join("; ")
            : formatValue(f.value),
      kind: f.kind,
      confidence: f.confidence,
      ...(f.note ? { note: f.note } : {}),
    });
  }
  return ctx;
}

function communications(c: Case): AgentContext["communications"] {
  const out: NonNullable<AgentContext["communications"]> = {};
  const cadence = c.context.fields["marketing.cadence"]?.value;
  if (Array.isArray(cadence) && cadence.length) {
    const channels = c.context.fields["marketing.channels"]?.value;
    const a = analyzeCadence(cadence, { problemTypes: c.problemTypes, channels: Array.isArray(channels) ? channels : [] });
    if (a.findings.length) out.cadence_analysis = a.findings;
  }
  const shots = (c.comms?.screenshots ?? []).filter((s) => s.review);
  if (shots.length) {
    out.screenshots = shots.map((s) => ({
      ...(s.channel || s.review?.channel ? { channel: s.channel ?? s.review?.channel } : {}),
      summary: s.review!.summary,
      ...(s.review!.cta ? { cta: s.review!.cta } : {}),
      ...(s.review!.offer ? { offer: s.review!.offer } : {}),
      ...(s.review!.personalisation ? { personalisation: s.review!.personalisation } : {}),
      issues: s.review!.issues,
    }));
    if (c.comms?.overall) out.screenshots_overall = c.comms.overall;
  }
  const pages = (c.comms?.pages ?? []).filter((p) => p.facts || p.review);
  if (pages.length) {
    out.pages = pages.map((p) => ({
      url: p.url,
      ...(p.title ? { title: p.title } : {}),
      ...(p.facts ? { read_from_html: [p.facts.headings.slice(0, 3).join(" / "), p.facts.ctas.length ? `CTAs: ${p.facts.ctas.slice(0, 5).join(", ")}` : "no clear CTA", `${p.facts.forms} form(s), ${p.facts.formFields} field(s)`, p.facts.offers.length ? `offers: ${p.facts.offers.slice(0, 2).join(" / ")}` : ""].filter(Boolean).join(" · ") } : {}),
      ...(p.review ? { summary: p.review.summary, issues: p.review.issues } : {}),
    }));
  }
  return Object.keys(out).length ? out : undefined;
}

export function serializeContext(ctx: AgentContext): string {
  return JSON.stringify(ctx, null, 1);
}
