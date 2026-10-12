"use client";

import type { Case, EvidenceKind, Pace, StrategyPlan } from "@/domain/types";
import { Badge } from "@/components/ui";

export const EVIDENCE: Record<EvidenceKind, { label: string; tone: "green" | "blue" | "amber" | "neutral"; hint: string }> = {
  observed: { label: "Observed", tone: "green", hint: "Stated by you or found in your data" },
  researched: { label: "Researched", tone: "blue", hint: "From public sources" },
  estimated: { label: "Estimated", tone: "amber", hint: "Calculated from stated assumptions" },
  unknown: { label: "Unknown", tone: "neutral", hint: "Needs input or validation" },
};

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  const e = EVIDENCE[kind];
  return <span title={e.hint}><Badge tone={e.tone}>{e.label}</Badge></span>;
}

export const PACE_LABEL: Record<Pace, string> = { aggressive: "Aggressive", balanced: "Balanced", conservative: "Conservative" };
export const PACE_HINT: Record<Pace, string> = {
  aggressive: "Speed first: parallel workstreams, minimum viable launch",
  balanced: "Phased implementation, standard QA, controlled tests",
  conservative: "Pilot first, validate, then scale",
};

export const TYPE_LABEL: Record<StrategyPlan["settings"]["type"], string> = {
  existing: "Improve existing marketing",
  gtm: "Go-to-market",
  launch: "Product / service launch",
  growth_problem: "Growth problem",
  retention: "Retention, loyalty & win-back",
  full: "Complete strategy",
};

export const HORIZON_LABEL: Record<StrategyPlan["settings"]["horizon"], string> = { "30d": "30 days", "90d": "90 days", "180d": "180 days", "12m": "12 months" };

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export type StrategyTab = "overview" | "interview" | "diagnosis" | "strategy" | "competitors" | "roadmap" | "budget" | "kpis" | "report" | "history";

/** The single next step in the strategy flow. */
export function nextStrategyStep(c: Case, ready: boolean): { label: string; tab: StrategyTab; detail: string; approve?: boolean } {
  const s = c.strategy!;
  if (!s.diagnosis && !ready) return { label: "Continue the interview", tab: "interview", detail: "A few essentials are still missing." };
  if (!s.diagnosis) return { label: "Diagnose the business", tab: "diagnosis", detail: "The interview has enough to diagnose." };
  if (!s.recommendations.length) return { label: "Build the strategy", tab: "strategy", detail: "Pillars, prioritised recommendations and channel plan." };
  if (!s.recommendations.some((r) => r.status === "approved")) return { label: "Review the recommendations", tab: "strategy", detail: "Approve the ones to plan; reject the rest with a reason." };
  if (!s.tasks.length) return { label: "Build roadmap, budget & KPIs", tab: "roadmap", detail: "Turn approved recommendations into an execution plan." };
  if (s.status !== "approved") return { label: "Approve the strategy", tab: "overview", detail: "Saves an approved version you can share and track.", approve: true };
  return { label: "Track execution", tab: "kpis", detail: "Update task status and KPI actuals as you go." };
}
