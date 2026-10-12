import type { CaseContext } from "@/domain/types";
import { isKnown } from "../context";

/**
 * Execution-readiness scores (0–100) derived from interview answers, before
 * any AI runs. Unanswered items lower the score and are listed as missing, so
 * the plan can include the work needed to close them.
 */

export interface ReadinessArea {
  area: string;
  score: number;
  note: string;
  missing: string[];
}

type Item = { key: string; label: string; score?: (v: unknown) => number };

const pick = (map: Record<string, number>) => (v: unknown) => {
  const vals = Array.isArray(v) ? v.map(String) : [String(v)];
  const scores = vals.map((x) => map[x]).filter((n): n is number => n !== undefined);
  return scores.length ? Math.max(...scores) : 60;
};

const AREAS: { area: string; items: Item[] }[] = [
  {
    area: "Audience clarity",
    items: [
      { key: "customer.ideal_customer", label: "Ideal customer" },
      { key: "customer.priority_segments", label: "Priority segments" },
      { key: "customer.why_choose_us", label: "Why customers choose you" },
      { key: "customer.objections", label: "Purchase objections" },
    ],
  },
  {
    area: "Goals & baseline",
    items: [
      { key: "business.strategy_objective", label: "Primary objective" },
      { key: "performance.target_outcome", label: "Target and deadline" },
      { key: "performance.business_baseline", label: "Current baseline" },
    ],
  },
  {
    area: "Data & tracking",
    items: [
      { key: "measurement.tracking_quality", label: "Tracking quality", score: pick({ "Reliable dashboards and tracking": 90, "Partial: some gaps": 60, "Mostly manual spreadsheets": 35, "Little or none": 15 }) },
      { key: "measurement.source_of_truth", label: "Single source of truth", score: pick({ "One trusted dashboard": 90, "Several sources that disagree": 45, "Manual spreadsheets": 35, None: 10 }) },
      { key: "measurement.conversion_tracking", label: "Ad conversion tracking", score: pick({ "Server-side events (Conversions API)": 90, "Offline conversion uploads": 85, "App SDK": 75, "Pixel / tag": 65, "Not set up": 10 }) },
    ],
  },
  {
    area: "Technology",
    items: [
      { key: "technology.stack_usage", label: "Tool adoption", score: pick({ "Live and well used": 90, "Licensed but under-used": 55, "Partly configured": 45, "Mostly manual": 20 }) },
      { key: "data.capabilities", label: "Audience and journey capabilities", score: (v) => (Array.isArray(v) ? (v.includes("None of these") ? 10 : Math.min(95, 30 + v.length * 13)) : 50) },
    ],
  },
  {
    area: "Budget clarity",
    items: [
      { key: "economics.monthly_budget", label: "Budget ceiling" },
      { key: "economics.budget_flexibility", label: "Budget flexibility" },
      { key: "economics.unit_economics", label: "CAC / ROAS / CLV" },
    ],
  },
  {
    area: "Team & capacity",
    items: [
      { key: "operations.team_capacity", label: "Team and weekly capacity" },
      { key: "operations.creative_capacity", label: "Creative capacity", score: pick({ "New assets every week": 90, "A few per month": 65, Occasionally: 40, "Very limited": 20 }) },
      { key: "operations.approval_cycle", label: "Approval speed", score: pick({ "A few days": 90, "About a week": 75, "2–4 weeks": 45, "More than a month": 25 }) },
    ],
  },
  {
    area: "Measurement & governance",
    items: [
      { key: "measurement.kpis_defined", label: "Agreed KPIs", score: pick({ "Yes, with targets": 90, Partly: 55, No: 15 }) },
      { key: "measurement.experimentation", label: "Testing practice", score: pick({ Never: 15, "Occasionally / ad-hoc": 45, "Control groups on key campaigns": 80, "Always-on incrementality measurement": 95 }) },
      { key: "measurement.stop_rules", label: "Stop rules", score: pick({ "Yes, a formal process": 90, Informal: 50, No: 15 }) },
    ],
  },
];

export function strategyReadiness(ctx: CaseContext): ReadinessArea[] {
  return AREAS.map(({ area, items }) => {
    const missing: string[] = [];
    const scores = items.map((it) => {
      if (ctx.unknownKeys.includes(it.key) || !isKnown(ctx, it.key)) {
        missing.push(it.label);
        return 0;
      }
      return it.score ? it.score(ctx.fields[it.key]!.value) : 80;
    });
    const score = Math.round(scores.reduce((s, n) => s + n, 0) / items.length);
    const note = missing.length === items.length ? "Not discussed yet" : score >= 70 ? "Ready" : score >= 45 ? "Workable with gaps" : "Needs work before scaling";
    return { area, score, note, missing };
  });
}
