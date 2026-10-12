import type { BrandProfile, Case, EvidenceKind, Pace } from "@/domain/types";
import { budgetTotals } from "@/engine/strategy/budget";
import { evaluateStrategy } from "@/engine/strategy/evaluate";
import { strategyReadiness } from "@/engine/strategy/readiness";
import { approvalWeeksFrom, schedule, weekToDate } from "@/engine/strategy/roadmap";
import { getIndustry } from "@/knowledge/industries";
import { money, type Block, type ReportModel, type ReportSection } from "./model";

/**
 * Strategy Builder report: the same format-agnostic model as diagnostic
 * cases, so every export (web, PDF, Word, PowerPoint, Markdown) carries the
 * brand and says the same thing. Section ids match the audience cuts.
 */

const EVIDENCE: Record<EvidenceKind, string> = { observed: "Observed", researched: "Researched", estimated: "Estimated", unknown: "Unknown" };
const PACE: Record<Pace, string> = { aggressive: "Aggressive", balanced: "Balanced", conservative: "Conservative" };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export function buildStrategyReportModel(c: Case, brand: BrandProfile): ReportModel {
  const s = c.strategy!;
  const sections: ReportSection[] = [];
  const add = (x: ReportSection) => {
    if (x.blocks.length) sections.push(x);
  };
  const live = s.recommendations.filter((r) => r.status !== "rejected");
  const approvalWeeks = approvalWeeksFrom(c.context.fields["operations.approval_cycle"]?.value);
  const startDate = (s.approval?.at ?? s.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const plans = s.tasks.length ? (["aggressive", "balanced", "conservative"] as Pace[]).map((pace) => schedule(s.tasks, { pace, settings: s.settings, approvalWeeks, startDate })) : [];
  const chosen = plans.find((p) => p.pace === s.settings.pace);
  let n = 0;
  const num = (t: string) => `${++n}. ${t}`;

  if (s.executive) {
    add({
      id: "executive", title: num("Executive Summary"), headline: s.executive.direction,
      blocks: [
        { type: "paragraph", text: s.executive.situation },
        { type: "callout", label: "Strategic direction", text: s.executive.direction },
        { type: "paragraph", text: s.executive.outcomes },
        ...(live.length ? [{ type: "bullets" as const, items: live.slice(0, 5).map((r) => `${r.title} (priority ${r.priority}${r.quickWin ? ", quick win" : ""})`) }] : []),
        ...(s.approval ? [{ type: "callout" as const, label: "Status", text: `Approved as version ${s.approval.version} on ${s.approval.at.slice(0, 10)}${s.approval.note ? `: ${s.approval.note}` : ""}` }] : [{ type: "callout" as const, label: "Status", text: "Draft for review. Not yet approved." }]),
      ],
    });
  }

  if (s.diagnosis) {
    const d = s.diagnosis;
    add({
      id: "findings", title: num("Current-State Diagnosis"), headline: d.summary.split(/(?<=\.)\s/)[0] ?? d.summary,
      blocks: [
        { type: "paragraph", text: d.summary },
        { type: "table", headers: ["Strengths", "Weaknesses", "Funnel gaps"], rows: zip3(d.strengths, d.weaknesses, d.funnelGaps) },
        ...(d.rootCauses.length ? [{ type: "table" as const, headers: ["Root cause (hypothesis)", "Evidence", "Confidence", "Validate with"], rows: d.rootCauses.map((r) => [r.statement, EVIDENCE[r.evidenceKind], pct(r.confidence), r.validateWith]) }] : []),
        ...(d.contradictions.length ? [{ type: "callout" as const, label: "Conflicting answers to resolve", text: d.contradictions.join(" ") }] : []),
      ],
    });
  }

  const readiness = strategyReadiness(c.context);
  add({
    id: "data", title: num("Execution Readiness"), headline: "How ready the business is to execute, from the interview",
    blocks: [
      { type: "table", headers: ["Area", "Score", "Assessment", "Missing information"], rows: readiness.map((r) => [r.area, `${r.score}/100`, r.note, r.missing.join(", ") || "None"]) },
      ...(s.diagnosis?.dataGaps.length ? [{ type: "table" as const, headers: ["Data gap", "Why it matters", "How to close it"], rows: s.diagnosis.dataGaps.map((g) => [g.item, g.why, g.proposal]) }] : []),
      ...(s.measurementReadiness.length ? [{ type: "callout" as const, label: "Measurement workstream first", text: s.measurementReadiness.join(" · ") }] : []),
    ],
  });

  add({
    id: "customer", title: num("Market & Audience Strategy"), headline: s.segments[0] ? `Lead with ${s.segments[0].name}` : "Priority segments",
    blocks: [
      ...(s.segments.length ? [{ type: "table" as const, headers: ["Segment", "Need", "Priority", "Evidence"], rows: s.segments.map((x) => [x.name, x.need, cap(x.priority), EVIDENCE[x.evidenceKind]]) }] : []),
      ...(s.messaging ? [
        { type: "callout" as const, label: "Value proposition", text: s.messaging.valueProposition },
        ...(s.messaging.audienceValueProps.length ? [{ type: "table" as const, headers: ["Audience", "Proposition"], rows: s.messaging.audienceValueProps.map((v) => [v.segment, v.proposition]) }] : []),
        ...(s.messaging.contentPillars.length ? [{ type: "bullets" as const, items: s.messaging.contentPillars.map((p) => `Content pillar: ${p}`) }] : []),
        ...(s.messaging.campaignConcepts.length ? [{ type: "table" as const, headers: ["Campaign concept", "Idea", "Audience", "Channels"], rows: s.messaging.campaignConcepts.map((k) => [k.name, k.idea, k.audience, k.channels.join(", ")]) }] : []),
      ] : []),
    ],
  });

  add({
    id: "hypotheses", title: num("Strategic Pillars"), headline: s.pillars.map((p) => p.title).join(" · "),
    blocks: s.pillars.length ? [{ type: "table", headers: ["Pillar", "Objective", "KPI", "Why"], rows: s.pillars.map((p) => [p.title, p.objective, p.kpi, p.rationale]) }] : [],
  });

  if (live.length) {
    const blocks: Block[] = [
      { type: "table", headers: ["#", "Recommendation", "Pillar", "Priority", "Status", "Panel verdict"], rows: live.map((r) => [String(r.rank), r.title, s.pillars.find((p) => p.id === r.pillarId)?.title ?? "", `${r.priority}${r.quickWin ? " · quick win" : ""}${r.needsNewTech ? " · new tech" : ""}`, cap(r.status), r.debate ? cap(r.debate.verdict.outcome) : "Not debated"]) },
      { type: "paragraph", text: "Priority = (impact × confidence × strategic fit) ÷ (effort × risk), normalised to 100. It ranks options; it does not predict results." },
    ];
    for (const r of live) {
      blocks.push({ type: "callout", label: `${r.rank}. ${r.title}`, text: r.action });
      blocks.push({
        type: "table", headers: ["Field", "Detail"], rows: [
          ["Problem", r.problem], ["Evidence", `${r.evidence} (${EVIDENCE[r.evidenceKind]})`], ["Root cause", r.rootCause], ["Why this, not alternatives", r.whyPrioritized],
          ["Audience", r.audience], ["Channels", r.channels.join(", ")], ["Owner", r.owner], ["Timeline", r.timeline], ["Budget", r.budget],
          ["KPI", r.kpi], ["Success criteria", r.successCriteria], ["Dependencies", r.dependencies.join("; ") || "None"], ["Risks", r.risks.join("; ") || "None"],
          ["Fallback", r.fallback], ["Confidence", `${pct(r.confidence)} · validate with: ${r.validateWith}`],
          ...(r.debate ? [["Devil's-advocate verdict", `${cap(r.debate.verdict.outcome)}: ${r.debate.verdict.reasoning}`]] : []),
        ],
      });
    }
    add({ id: "recommendations", title: num("Prioritised Recommendations"), headline: `${live.length} actions, ranked by business impact`, blocks });
  }

  add({
    id: "journey", title: num("Channel Strategy"), headline: "Optimise what works before adding channels",
    blocks: s.channelPlan.length ? [{ type: "table", headers: ["Channel", "Plan", "Role", "Funnel stage", "KPI", "Why"], rows: s.channelPlan.map((x) => [x.channel, cap(x.status), x.role, x.funnelStage, x.kpi, x.rationale]) }] : [],
  });

  if (s.budget.length) {
    const blocks: Block[] = [{
      type: "table", headers: ["Scenario", "Monthly", "One-time", "Media", "Technology", "Agency", "Creative", "Internal"],
      rows: s.budget.map((b) => {
        const t = budgetTotals(b);
        return [PACE[b.pace], money(t.monthly, c.currency), money(t.oneTime, c.currency), ...(["media", "technology", "agency", "creative", "internal"] as const).map((k) => money(t.byCategory[k].monthly, c.currency))];
      }),
    }];
    for (const b of s.budget) {
      blocks.push({ type: "callout", label: `${PACE[b.pace]} scenario`, text: b.summary });
      blocks.push({ type: "table", headers: ["Line", "Category", "Monthly", "One-time", "Note"], rows: b.lines.map((l) => [l.item, cap(l.category), money(l.monthly, c.currency), money(l.oneTime, c.currency), l.note ?? ""]) });
      if (b.forecast) blocks.push({ type: "paragraph", text: `Estimate (not a guarantee), ${b.forecast.metric}: low ${b.forecast.low.toLocaleString("en")}, base ${b.forecast.base.toLocaleString("en")}, high ${b.forecast.high.toLocaleString("en")}. Assumptions: ${b.forecast.assumptions.join("; ")}.` });
      if (b.scalingCriteria.length) blocks.push({ type: "bullets", items: b.scalingCriteria.map((x) => `Scale only when: ${x}`) });
    }
    add({ id: "economics", title: num("Budget Scenarios & Paid Media Plan"), headline: "Three budget scenarios, totals computed in code", blocks });
  }

  add({
    id: "activation", title: num("CRM & Lifecycle Plan"), headline: "Journeys across the customer lifecycle",
    blocks: s.lifecycle.length ? [{ type: "table", headers: ["Stage", "Journey", "Trigger", "Channels", "KPI"], rows: s.lifecycle.map((l) => [cap(l.stage), l.journey, l.trigger, l.channels.join(", "), l.kpi]) }] : [],
  });

  if (s.gtm) {
    add({
      id: "gtm", title: num("Go-to-Market Plan"), headline: s.gtm.positioning,
      blocks: [
        { type: "callout", label: "Positioning", text: s.gtm.positioning },
        { type: "paragraph", text: `Target segments: ${s.gtm.targetSegments.join(", ")}. Offer: ${s.gtm.offer}.` },
        { type: "flow", steps: s.gtm.phases.map((p) => ({ type: "action", label: `${p.name}: ${p.goal}` })) },
        { type: "table", headers: ["Phase", "Goal", "Activities", "Exit criteria"], rows: s.gtm.phases.map((p) => [p.name, p.goal, p.activities.join("; "), p.exitCriteria]) },
        ...(s.gtm.salesEnablement.length ? [{ type: "bullets" as const, items: s.gtm.salesEnablement }] : []),
      ],
    });
  }

  if (s.research && s.settings.competitor !== "none") {
    const r = s.research;
    add({
      id: "competitors", title: num("Competitor Intelligence"), headline: "Observable activity only; no private data is estimated",
      blocks: [
        { type: "table", headers: ["Competitor", "Area", "Finding", "Basis"], rows: r.findings.map((f) => [f.competitor, f.category, f.finding, f.kind === "observed" ? `Observed${f.source ? ` (${f.source})` : ""}` : f.kind === "sourced" ? `Sourced${f.source ? ` (${f.source})` : ""}` : "Hypothesis, to verify"]) },
        ...(r.comparisons.length ? [{ type: "table" as const, headers: ["Dimension", "Us", ...unique(r.comparisons.flatMap((x) => x.them.map((t) => t.competitor)))], rows: r.comparisons.map((x) => [x.dimension, x.us, ...unique(r.comparisons.flatMap((y) => y.them.map((t) => t.competitor))).map((name) => x.them.find((t) => t.competitor === name)?.note ?? "")]) }] : []),
        ...(r.implications.length ? [{ type: "bullets" as const, items: r.implications }] : []),
      ],
    });
  }

  if (chosen) {
    add({
      id: "roadmap", title: num("Timeline & Resource Plan"), headline: `${PACE[chosen.pace]} plan: about ${Math.ceil(chosen.totalWeeks)} weeks, ${chosen.startDate} to ${chosen.endDate}`,
      blocks: [
        { type: "table", headers: ["Scenario", "Duration", "Ends", "First launch", "Issues"], rows: plans.map((p) => [PACE[p.pace], `${Math.ceil(p.totalWeeks)} weeks`, p.endDate, p.firstLaunchWeek !== null ? weekToDate(p.startDate, p.firstLaunchWeek) : "n/a", p.issues.join(" ") || "None"]) },
        { type: "table", headers: ["Workstream", "Task", "Owner", "Start", "End", "Deliverable", "Critical"], rows: chosen.tasks.map((t) => [t.workstream, t.title, t.owner, weekToDate(chosen.startDate, t.start), weekToDate(chosen.startDate, t.end), t.deliverable, t.critical ? "Yes" : ""]) },
        ...(chosen.tradeoffs.length ? [{ type: "bullets" as const, items: chosen.tradeoffs }] : []),
      ],
    });
  }

  add({
    id: "measurement", title: num("KPI Tree & Measurement"), headline: s.kpis.find((k) => k.level === "north_star")?.name ?? "KPIs",
    blocks: s.kpis.length ? [{ type: "table", headers: ["Level", "KPI", "Definition", "Baseline", "Target", "Cadence", "Source", "Actual"], rows: s.kpis.map((k) => [cap(k.level), k.name, k.definition, k.baseline ?? "To measure", k.target ?? "Set after baseline", k.cadence, k.source, k.actual ?? ""]) }] : [],
  });

  add({
    id: "experiments", title: num("Experiments"), headline: "How each bet will be proven",
    blocks: s.experiments.length ? [{ type: "table", headers: ["Test", "Hypothesis", "Metric", "Design", "Success threshold", "Duration"], rows: s.experiments.map((e) => [e.name, e.hypothesis, e.metric, e.design, e.successThreshold, e.duration]) }] : [],
  });

  add({
    id: "risks", title: num("Risk Register"), headline: "Risks and mitigations",
    blocks: s.risks.length ? [{ type: "table", headers: ["Risk", "Category", "Likelihood", "Impact", "Mitigation"], rows: s.risks.map((r) => [r.risk, cap(r.category), cap(r.likelihood), cap(r.impact), r.mitigation]) }] : [],
  });

  add({ id: "next", title: num("First 30 Days"), headline: "What happens next", blocks: s.first30Days.length ? [{ type: "bullets", items: s.first30Days }] : [] });

  const quality = evaluateStrategy(c);
  add({
    id: "assumptions", title: num("Open Questions, Assumptions & Quality Checks"), headline: "What still needs validating",
    blocks: [
      ...(s.openQuestions.length ? [{ type: "bullets" as const, items: s.openQuestions }] : []),
      ...(s.diagnosis?.assumptions.length ? [{ type: "bullets" as const, items: s.diagnosis.assumptions.map((a) => `Assumption: ${a}`) }] : []),
      ...(quality.length ? [{ type: "table" as const, headers: ["Check", "Result", "Detail"], rows: quality.map((q) => [q.label, q.ok ? "Pass" : "Review", q.detail]) }] : []),
    ],
  });

  add({
    id: "legend", title: "How to read this strategy", headline: "Evidence labels",
    blocks: [{ type: "bullets", items: ["Observed: stated by the business or found in its data.", "Researched: from public sources, cited.", "Estimated: calculated from stated assumptions.", "Unknown: needs input or validation before relying on it.", "Forecasts are estimates with ranges, never guarantees."] }],
  });

  const industry = getIndustry(c.industryId);
  return {
    title: c.name,
    subtitle: `${industry ? `${industry.name} · ` : ""}Marketing Strategy${s.approval ? ` · Approved v${s.approval.version}` : " · Draft"}`,
    companyName: brand.companyName || "",
    generatedAt: new Date().toISOString(),
    brand,
    sections,
  };
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function zip3(a: string[], b: string[], c: string[]): string[][] {
  const n = Math.max(a.length, b.length, c.length);
  return Array.from({ length: n }, (_, i) => [a[i] ?? "", b[i] ?? "", c[i] ?? ""]);
}
