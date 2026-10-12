import type { BudgetScenario, CaseContext } from "@/domain/types";

/**
 * Budget arithmetic is done in code, never trusted from the model: totals by
 * category, recurring vs one-time, and checks against the stated ceiling and
 * budget flexibility.
 */

export const BUDGET_CATEGORIES = ["media", "technology", "agency", "creative", "internal"] as const;

export interface BudgetTotals {
  monthly: number;
  oneTime: number;
  byCategory: Record<(typeof BUDGET_CATEGORIES)[number], { monthly: number; oneTime: number }>;
  /** Spend over a horizon in months: one-time + monthly × months. */
  overMonths: (months: number) => number;
}

export function budgetTotals(s: Pick<BudgetScenario, "lines">): BudgetTotals {
  const byCategory = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, { monthly: 0, oneTime: 0 }])) as BudgetTotals["byCategory"];
  for (const l of s.lines) {
    byCategory[l.category].monthly += l.monthly;
    byCategory[l.category].oneTime += l.oneTime;
  }
  const monthly = s.lines.reduce((t, l) => t + l.monthly, 0);
  const oneTime = s.lines.reduce((t, l) => t + l.oneTime, 0);
  return { monthly, oneTime, byCategory, overMonths: (m) => oneTime + monthly * m };
}

export function monthlyCeiling(ctx: CaseContext): number | undefined {
  const v = ctx.fields["economics.monthly_budget"]?.value;
  return typeof v === "number" && v > 0 ? v : undefined;
}

export function canScaleAboveCeiling(ctx: CaseContext): boolean {
  return ctx.fields["economics.budget_flexibility"]?.value === "Can scale once results are proven";
}

/** Plain-language problems with a scenario's budget. */
export function budgetIssues(s: BudgetScenario, ctx: CaseContext): string[] {
  const out: string[] = [];
  const t = budgetTotals(s);
  const ceiling = monthlyCeiling(ctx);
  if (ceiling !== undefined && t.monthly > ceiling * 1.001) {
    if (s.pace !== "aggressive") out.push(`Recurring spend (${Math.round(t.monthly).toLocaleString("en")}/month) is above the stated ceiling of ${Math.round(ceiling).toLocaleString("en")}.`);
    else if (!canScaleAboveCeiling(ctx)) out.push(`Aggressive spend exceeds the ceiling, but the budget was described as not scalable. Treat the excess as conditional.`);
  }
  const f = s.forecast;
  if (f && !(f.low <= f.base && f.base <= f.high)) out.push("Forecast range is inconsistent (low, base and high are out of order).");
  if (f && !f.assumptions.length) out.push("Forecast has no stated assumptions.");
  if (!s.scalingCriteria.length && s.pace === "aggressive") out.push("Aggressive scenario has no scaling criteria; spend should rise only when they are met.");
  return out;
}
