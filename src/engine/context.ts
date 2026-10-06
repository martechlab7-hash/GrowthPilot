import type {
  CaseContext,
  ConfidenceLevel,
  ContextField,
  FieldValue,
  KnowledgeKind,
  Stage,
} from "@/domain/types";

const PREFIX_STAGE: Record<string, Stage> = {
  business: "business",
  problem: "business",
  operations: "business",
  performance: "diagnosis",
  competition: "diagnosis",
  customer: "customer",
  experience: "customer",
  data: "data",
  technology: "technology",
  marketing: "activation",
  measurement: "measurement",
  economics: "economics",
};

export function stageForKey(key: string): Stage {
  const prefix = key.split(".")[0] ?? "";
  return PREFIX_STAGE[prefix] ?? "business";
}

export function emptyContext(): CaseContext {
  return { fields: {}, unknownKeys: [], notes: "" };
}

export function hasValue(value: FieldValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function isKnown(ctx: CaseContext, key: string): boolean {
  return hasValue(ctx.fields[key]?.value);
}

export function getValue(ctx: CaseContext, key: string): FieldValue | undefined {
  return ctx.fields[key]?.value;
}

export function getString(ctx: CaseContext, key: string): string | undefined {
  const v = getValue(ctx, key);
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

export function getList(ctx: CaseContext, key: string): string[] {
  const v = getValue(ctx, key);
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

export function getNumber(ctx: CaseContext, key: string): number | undefined {
  const v = getValue(ctx, key);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return v.trim() && Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export interface SetFieldInput {
  key: string;
  value: FieldValue;
  kind?: KnowledgeKind;
  source?: ContextField["source"];
  confidence?: ConfidenceLevel;
  questionId?: string;
  note?: string;
  by: string;
  at?: string;
}

/**
 * Write a field. A user-provided fact is never overwritten by an AI-extracted
 * or inferred value — facts outrank inferences.
 */
export function setField(ctx: CaseContext, input: SetFieldInput): CaseContext {
  const existing = ctx.fields[input.key];
  const source = input.source ?? "user";
  if (existing && existing.kind === "fact" && existing.source === "user" && source !== "user") {
    return ctx;
  }
  const field: ContextField = {
    key: input.key,
    stage: stageForKey(input.key),
    value: input.value,
    kind: input.kind ?? (source === "user" || source === "document" ? "fact" : "inference"),
    source,
    confidence: input.confidence ?? (source === "user" ? "high" : "medium"),
    questionId: input.questionId,
    note: input.note,
    updatedAt: input.at ?? new Date().toISOString(),
    updatedBy: input.by,
  };
  if (field.questionId === undefined) delete field.questionId;
  if (field.note === undefined) delete field.note;
  return {
    ...ctx,
    fields: { ...ctx.fields, [input.key]: field },
    unknownKeys: ctx.unknownKeys.filter((k) => k !== input.key),
  };
}

/** Record that the user does not know the answer, so we never ask again. */
export function markUnknown(ctx: CaseContext, key: string): CaseContext {
  if (ctx.unknownKeys.includes(key)) return ctx;
  return { ...ctx, unknownKeys: [...ctx.unknownKeys, key] };
}

export function fieldsByStage(ctx: CaseContext): Record<Stage, ContextField[]> {
  const out = {
    business: [], diagnosis: [], customer: [], data: [],
    technology: [], activation: [], measurement: [], economics: [],
  } as Record<Stage, ContextField[]>;
  for (const f of Object.values(ctx.fields)) out[f.stage].push(f);
  return out;
}

export function formatValue(value: FieldValue): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  const s = last.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
