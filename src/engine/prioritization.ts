import type { Priority } from "@/domain/types";

export interface PriorityInputs {
  impactScore: number; // 1–5
  effortScore: number; // 1–5
  confidence: number; // 0–1
  strategicFit: number; // 1–5
  timeToValueWeeks: number;
}

/** Priority Score = Impact × Confidence × Strategic Fit ÷ Effort (spec §17). */
export function priorityScore(i: PriorityInputs): number {
  const effort = Math.max(1, i.effortScore);
  const raw = (i.impactScore * clamp01(i.confidence) * i.strategicFit) / effort;
  return Math.round(raw * 100) / 100;
}

export function classifyPriority(i: PriorityInputs): Priority {
  const score = priorityScore(i);
  let p: Priority = score >= 8 ? "P0" : score >= 4 ? "P1" : score >= 2 ? "P2" : "P3";
  // "Immediate" requires near-term value; long-horizon work cannot be P0.
  if (p === "P0" && i.timeToValueWeeks > 12) p = "P1";
  return p;
}

export function prioritize<T extends PriorityInputs>(items: T[]): (T & { priorityScore: number; priority: Priority })[] {
  return items
    .map((it) => ({ ...it, priorityScore: priorityScore(it), priority: classifyPriority(it) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}
