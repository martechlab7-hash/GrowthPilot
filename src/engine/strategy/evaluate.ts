import type { Case } from "@/domain/types";
import { budgetIssues } from "./budget";
import { approvalWeeksFrom, schedule } from "./roadmap";

/**
 * Quality gate run in code before a strategy is presented: completeness,
 * actionability, budget arithmetic, timeline feasibility, channel rules,
 * measurement readiness and evidence traceability.
 */

export interface QualityCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

const VAGUE = /^(improve|increase|boost|enhance|optimi[sz]e|leverage|focus on|drive|grow)\b[^.]{0,40}$/i;

export function evaluateStrategy(c: Case): QualityCheck[] {
  const s = c.strategy;
  if (!s) return [];
  const checks: QualityCheck[] = [];
  const live = s.recommendations.filter((r) => r.status !== "rejected");

  const incomplete = live.filter((r) => !r.kpi.trim() || !r.owner.trim() || !r.successCriteria.trim() || !r.fallback.trim() || !r.timeline.trim());
  checks.push({
    id: "complete", label: "Every recommendation has an owner, KPI, success criteria, timeline and fallback",
    ok: incomplete.length === 0,
    detail: incomplete.length ? `Missing fields in: ${incomplete.map((r) => r.title).join("; ")}` : `${live.length} recommendation(s) complete`,
  });

  const vague = live.filter((r) => VAGUE.test(r.action.trim()) || r.action.trim().split(/\s+/).length < 6);
  checks.push({
    id: "actionable", label: "Recommendations are specific actions, not slogans",
    ok: vague.length === 0,
    detail: vague.length ? `Too generic: ${vague.map((r) => `"${r.action}"`).join("; ")}` : "All actions name what to do, for whom and how",
  });

  const excluded = c.context.fields["marketing.channels_excluded"]?.value;
  const banned = Array.isArray(excluded) ? excluded.map((x) => x.toLowerCase()) : [];
  const breaches = live.filter((r) => r.channels.some((ch) => banned.includes(ch.toLowerCase())));
  const planBreaches = s.channelPlan.filter((p) => p.status !== "exclude" && banned.includes(p.channel.toLowerCase()));
  checks.push({
    id: "channels", label: "Excluded channels are not recommended",
    ok: !breaches.length && !planBreaches.length,
    detail: breaches.length || planBreaches.length ? `Uses excluded channel(s) in: ${[...breaches.map((r) => r.title), ...planBreaches.map((p) => p.channel)].join("; ")}` : banned.length ? `Respects ${banned.length} excluded channel(s)` : "No channels were excluded",
  });

  const budgetProblems = s.budget.flatMap((b) => budgetIssues(b, c.context).map((i) => `${b.pace}: ${i}`));
  checks.push({
    id: "budget", label: "Budget scenarios add up and respect the ceiling",
    ok: s.budget.length > 0 && budgetProblems.length === 0,
    detail: !s.budget.length ? "No budget scenarios yet" : budgetProblems.length ? budgetProblems.join(" ") : "Totals computed in code; within the stated ceiling",
  });

  if (s.tasks.length) {
    const plan = schedule(s.tasks, { pace: s.settings.pace, settings: s.settings, approvalWeeks: approvalWeeksFrom(c.context.fields["operations.approval_cycle"]?.value) });
    checks.push({
      id: "timeline", label: `The ${s.settings.pace} timeline is feasible`,
      ok: plan.issues.length === 0,
      detail: plan.issues.length ? plan.issues.join(" ") : `About ${Math.ceil(plan.totalWeeks)} weeks; fits the ${s.settings.horizon} horizon`,
    });
  } else {
    checks.push({ id: "timeline", label: "Roadmap built", ok: false, detail: "Build the roadmap to check feasibility" });
  }

  const tracking = c.context.fields["measurement.tracking_quality"]?.value;
  const weakTracking = tracking === "Mostly manual spreadsheets" || tracking === "Little or none" || c.context.unknownKeys.includes("measurement.tracking_quality");
  checks.push({
    id: "measurement", label: "Measurement readiness is planned where tracking is weak",
    ok: !weakTracking || s.measurementReadiness.length > 0,
    detail: weakTracking ? (s.measurementReadiness.length ? "A measurement workstream comes before optimisation" : "Tracking is weak but no measurement workstream was planned") : "Tracking is reported as reliable",
  });

  const overclaimed = live.filter((r) => r.evidenceKind === "unknown" && r.confidence > 0.7);
  checks.push({
    id: "evidence", label: "Confidence matches the evidence",
    ok: overclaimed.length === 0,
    detail: overclaimed.length ? `High confidence without evidence: ${overclaimed.map((r) => r.title).join("; ")}` : "No high-confidence claims rest on unknown evidence",
  });

  checks.push({
    id: "kpis", label: "There is a KPI tree with a north star and guardrails",
    ok: s.kpis.some((k) => k.level === "north_star") && s.kpis.some((k) => k.level === "guardrail"),
    detail: s.kpis.length ? `${s.kpis.length} KPI(s)` : "No KPIs yet",
  });
  return checks;
}
