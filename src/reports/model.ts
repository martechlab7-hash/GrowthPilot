import type { BrandProfile, Case, ScenarioResult } from "@/domain/types";
import { formatValue, humanizeKey } from "@/engine/context";
import { assessMaturity } from "@/engine/maturity";
import { STAGE_LABELS } from "@/engine/interview";
import { getIndustry } from "@/knowledge/industries";

/**
 * A format-agnostic report model. Web, Markdown, DOCX, PPTX and PDF renderers
 * all consume this, so every deliverable says exactly the same thing.
 */
export type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; label: string; text: string };

export interface ReportSection {
  id: string;
  title: string;
  /** One-line headline used as the slide title in PowerPoint. */
  headline: string;
  blocks: Block[];
}

export interface ReportModel {
  title: string;
  subtitle: string;
  companyName: string;
  generatedAt: string;
  brand: BrandProfile;
  sections: ReportSection[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0, notation: Math.abs(n) >= 1e7 ? "compact" : "standard" }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString("en")}`;
  }
}

function scenarioRows(s: ScenarioResult[], currency: string): string[][] {
  return s.map((x) => [
    cap(x.name),
    `${x.liftPct}%`,
    x.customersImpacted.toLocaleString("en"),
    money(x.incrementalRevenue, currency),
    money(x.incrementalGrossProfit, currency),
    money(x.programCost, currency),
    x.roi === null ? "n/a" : `${Math.round(x.roi * 100)}%`,
    x.paybackMonths === null ? "Not within horizon" : `${x.paybackMonths} mo`,
  ]);
}

export function buildReportModel(c: Case, brand: BrandProfile): ReportModel {
  const r = c.report;
  const maturity = assessMaturity(c.context);
  const industry = getIndustry(c.industryId);
  const fields = Object.values(c.context.fields);
  const byStage = (stages: string[]) => fields.filter((f) => stages.includes(f.stage));
  const factRows = (stages: string[]) =>
    byStage(stages).map((f) => [humanizeKey(f.key), formatValue(f.value), cap(f.kind)]);
  const sections: ReportSection[] = [];
  const add = (s: ReportSection) => {
    if (s.blocks.length) sections.push(s);
  };

  if (r) {
    add({
      id: "executive",
      title: "Executive Summary",
      headline: r.executive.whatIsHappening,
      blocks: [
        { type: "callout", label: "What is happening?", text: r.executive.whatIsHappening },
        { type: "paragraph", text: "Why is it happening?" },
        { type: "bullets", items: r.executive.whyItIsHappening },
        { type: "paragraph", text: "What should we do?" },
        { type: "bullets", items: r.executive.whatWeShouldDo },
        { type: "callout", label: "What will it deliver?", text: r.executive.whatItWillDeliver },
        {
          type: "table",
          headers: ["Next 30 days", "30–60 days", "60–90 days"],
          rows: zip3(r.executive.whatHappensNext.days30, r.executive.whatHappensNext.days60, r.executive.whatHappensNext.days90),
        },
      ],
    });
  }

  const objective = c.context.fields["business.primary_objective"];
  const target = c.context.fields["performance.target"];
  add({
    id: "objective",
    title: "1. Business Objective",
    headline: objective ? `Objective: ${formatValue(objective.value)}` : "Business objective",
    blocks: [
      ...(objective ? [{ type: "paragraph" as const, text: `Primary objective: ${formatValue(objective.value)}.` }] : [{ type: "callout" as const, label: "Data gap", text: "Business objective was not specified." }]),
      ...(target ? [{ type: "paragraph" as const, text: `Target: ${formatValue(target.value)}.` }] : []),
      ...(industry ? [{ type: "paragraph" as const, text: `Industry: ${industry.name}. Economic model: ${industry.economicModel}` }] : []),
    ],
  });

  add({
    id: "problem",
    title: "2. Problem Statement",
    headline: "The problem as stated",
    blocks: [{ type: "paragraph", text: c.problemStatement }, ...(factRows(["business"]).length ? [{ type: "table" as const, headers: ["Business context", "Value", "Type"], rows: factRows(["business"]) }] : [])],
  });

  add({
    id: "findings",
    title: "3. Key Findings",
    headline: "Key findings",
    blocks: r?.keyFindings.length
      ? [{ type: "bullets", items: r.keyFindings }]
      : c.diagnosis
        ? [{ type: "bullets", items: c.diagnosis.findings.map((f) => f.finding) }]
        : [],
  });

  if (c.diagnosis) {
    const d = c.diagnosis;
    add({
      id: "diagnosis",
      title: "4. Diagnosis",
      headline: `Diagnosis (confidence ${pct(d.confidence)})`,
      blocks: [
        { type: "paragraph", text: d.summary },
        {
          type: "table",
          headers: ["Finding", "Stage", "Impact", "Confidence", "Evidence"],
          rows: d.findings.map((f) => [f.finding, STAGE_LABELS[f.stage], cap(f.impact), pct(f.confidence), f.evidence.map((e) => `[${e.kind}] ${e.statement}`).join("\n")]),
        },
        ...(d.highConfidence.length ? [{ type: "callout" as const, label: "High confidence", text: d.highConfidence.join("; ") }] : []),
        ...(d.mediumConfidence.length ? [{ type: "callout" as const, label: "Medium confidence", text: d.mediumConfidence.join("; ") }] : []),
        ...(d.lowConfidence.length ? [{ type: "callout" as const, label: "Low confidence", text: d.lowConfidence.join("; ") }] : []),
      ],
    });
  }

  add({
    id: "customer",
    title: "5. Customer Insights",
    headline: "Customer insights",
    blocks: [
      ...(r?.customerInsights.length ? [{ type: "bullets" as const, items: r.customerInsights }] : []),
      ...(factRows(["customer"]).length ? [{ type: "table" as const, headers: ["Customer context", "Value", "Type"], rows: factRows(["customer"]) }] : []),
    ],
  });

  add({
    id: "data",
    title: "6. Data Assessment",
    headline: "Data assessment",
    blocks: [
      ...(r?.dataAssessment ? [{ type: "paragraph" as const, text: r.dataAssessment }] : []),
      ...(factRows(["data"]).length ? [{ type: "table" as const, headers: ["Data", "Value", "Type"], rows: factRows(["data"]) }] : []),
      ...(c.dataGaps.length
        ? [{ type: "table" as const, headers: ["Critical missing data", "Why needed", "Expected insight", "Priority", "Alternative proxy"], rows: c.dataGaps.map((g) => [g.dataset, g.whyNeeded, g.expectedInsight, cap(g.priority), g.alternativeProxy]) }]
        : []),
    ],
  });

  add({
    id: "technology",
    title: "7. Technology Assessment",
    headline: `MarTech maturity: Level ${maturity.level} — ${maturity.levelName}`,
    blocks: [
      ...(r?.technologyAssessment ? [{ type: "paragraph" as const, text: r.technologyAssessment }] : []),
      { type: "table", headers: ["Dimension", "Score (0–5)", "Basis"], rows: maturity.dimensions.map((d) => [d.dimension, String(d.score), d.rationale]) },
      ...(maturity.basedOnFields < 5 ? [{ type: "callout" as const, label: "Low confidence", text: `Maturity is based on only ${maturity.basedOnFields} answered inputs.` }] : []),
    ],
  });

  add({
    id: "hypotheses",
    title: "8. Key Hypotheses",
    headline: "What we believe is happening (validated)",
    blocks: c.hypotheses.length
      ? [
          {
            type: "table",
            headers: ["Hypothesis", "Status", "Confidence", "Impact", "Missing evidence"],
            rows: c.hypotheses.map((h) => [h.statement + (h.userFeedback ? `\nUser feedback: ${h.userFeedback}` : ""), statusLabel(h.status), pct(h.confidence), cap(h.businessImpact), h.missingEvidence.join("; ") || "—"]),
          },
        ]
      : [],
  });

  add({
    id: "recommendations",
    title: "9. Strategic Recommendations",
    headline: `${c.recommendations.length} prioritised recommendations`,
    blocks: c.recommendations.length
      ? [
          {
            type: "table",
            headers: ["Priority", "Recommendation", "Why", "Target customer", "Expected impact", "Effort", "Time to value"],
            rows: c.recommendations.map((x) => [`${x.priority} (${x.priorityScore})`, x.title, x.why, x.targetCustomer, x.expectedImpact, `${cap(x.complexity)} complexity / ${cap(x.cost)} cost`, `${x.timeToValueWeeks} weeks`]),
          },
          ...c.recommendations.slice(0, 6).map((x) => ({
            type: "callout" as const,
            label: `${x.priority} · ${x.title}`,
            text: [
              `Problem addressed: ${x.problemAddressed}`,
              `Data: ${x.requiredData.join(", ") || "—"}`,
              `Technology: ${x.requiredTechnology.join(", ") || "Existing stack"}`,
              `Activation: ${x.activation.join(" → ") || "—"}`,
              `Measurement: ${x.measurement.join(", ") || "—"}`,
              `Dependencies: ${x.dependencies.join(", ") || "—"}`,
              `Risks: ${x.risks.join(", ") || "—"}`,
              ...(x.assumptions.length ? [`Assumptions: ${x.assumptions.join("; ")}`] : []),
            ].join("\n"),
          })),
        ]
      : [],
  });

  add({
    id: "journey",
    title: "10. Customer Journey",
    headline: "Customer journey: where we intervene",
    blocks: c.customerJourney.length
      ? [{ type: "table", headers: ["Stage", "Customer need", "Pain point", "Trigger", "Activation", "KPI"], rows: c.customerJourney.map((s) => [s.stage, s.customerNeed, s.painPoint, s.trigger, s.activation, s.kpi]) }]
      : [],
  });

  add({
    id: "activation",
    title: "11. Activation Strategy",
    headline: "Activation journeys",
    blocks: c.journeys.flatMap((j) => [
      { type: "callout" as const, label: j.name, text: `Objective: ${j.objective}\nAudience: ${j.audience}\nChannels: ${j.channels.join(", ")}\nControl group: ${j.controlGroup}` },
      { type: "bullets" as const, items: j.steps.map((s) => `${cap(s.type)}: ${s.label}${s.branches?.length ? ` (${s.branches.map((b) => b.label).join(" / ")})` : ""}`) },
    ]),
  });

  add({
    id: "martech",
    title: "12. MarTech Architecture",
    headline: "Capability gaps drive technology choices",
    blocks: [
      { type: "table", headers: ["Capability", "Current", "Gap", "Recommendation"], rows: maturity.capabilityGaps.map((g) => [g.capability, g.current, g.gap || "—", g.recommendation]) },
      ...(c.recommendations.some((x) => x.requiredTechnology.length)
        ? [{ type: "bullets" as const, items: unique(c.recommendations.flatMap((x) => x.requiredTechnology)).map((t) => `${t} — required by: ${c.recommendations.filter((x) => x.requiredTechnology.includes(t)).map((x) => x.title).join(", ")}`) }]
        : []),
    ],
  });

  if (c.measurement) {
    const m = c.measurement;
    add({
      id: "measurement",
      title: "13. Measurement Framework",
      headline: `North Star: ${m.northStar}`,
      blocks: [
        { type: "table", headers: ["Level", "KPI", "Definition", "Type", "Target"], rows: m.kpis.map((k) => [cap(k.level), k.name, k.definition, cap(k.type), k.target ?? "To be baselined"]) },
        { type: "callout", label: "Attribution", text: m.attribution },
        { type: "callout", label: "Incrementality", text: m.incrementality },
      ],
    });
  }

  add({
    id: "experiments",
    title: "14. Experimentation Plan",
    headline: "Experiments to prove incrementality",
    blocks: c.experiments.length
      ? [{ type: "table", headers: ["Hypothesis", "Audience", "Control vs treatment", "Primary KPI", "Sample / duration", "Success criteria"], rows: c.experiments.map((e) => [e.hypothesis, e.audience, `${e.control} vs ${e.treatment}`, e.primaryKpi, `${e.sampleSize} / ${e.duration}`, e.successCriteria]) }]
      : [],
  });

  if (c.economics) {
    const e = c.economics;
    add({
      id: "economics",
      title: "15. Economics",
      headline: `Modelled value: ${money(e.scenarios.find((s) => s.name === "base")?.incrementalRevenue ?? 0, e.inputs.currency)} incremental revenue (base case)`,
      blocks: [
        { type: "callout", label: "Modelled estimate", text: e.disclaimer },
        { type: "table", headers: ["Scenario", "Lift", "Customers", "Revenue", "Gross profit", "Program cost", "ROI", "Payback"], rows: scenarioRows(e.scenarios, e.inputs.currency) },
        {
          type: "table",
          headers: ["Input", "Value", "Type"],
          rows: [
            ["Eligible customers", e.inputs.eligibleCustomers.toLocaleString("en"), cap(e.inputProvenance.eligibleCustomers ?? "assumption")],
            ["Average annual value", money(e.inputs.averageAnnualValue, e.inputs.currency), cap(e.inputProvenance.averageAnnualValue ?? "assumption")],
            ["Gross margin", `${e.inputs.grossMarginPct}%`, cap(e.inputProvenance.grossMarginPct ?? "assumption")],
            ["Investment", money(e.inputs.investment, e.inputs.currency), "Assumption"],
            ["Monthly run cost", money(e.inputs.monthlyRunCost, e.inputs.currency), "Assumption"],
          ],
        },
        { type: "paragraph", text: "Revenue impact and profit impact are reported separately: profit applies gross margin and deducts programme cost over a 12-month horizon." },
      ],
    });
  }

  if (r) {
    add({
      id: "roadmap",
      title: "16. Implementation Roadmap",
      headline: "Implementation roadmap",
      blocks: [{ type: "table", headers: ["Horizon", "Theme", "Initiatives"], rows: r.roadmap.map((x) => [x.horizon, x.theme, x.initiatives.join("\n")]) }],
    });
    add({ id: "risks", title: "17. Risks", headline: "Risks and mitigations", blocks: r.risks.length ? [{ type: "table", headers: ["Risk", "Mitigation"], rows: r.risks.map((x) => [x.risk, x.mitigation]) }] : [] });
    add({ id: "dependencies", title: "18. Dependencies", headline: "Dependencies", blocks: r.dependencies.length ? [{ type: "bullets", items: r.dependencies }] : [] });
    add({ id: "next", title: "19. Next Steps", headline: "Next steps", blocks: r.nextSteps.length ? [{ type: "bullets", items: r.nextSteps }] : [] });
  }

  add({
    id: "assumptions",
    title: "Appendix A. Assumption Register",
    headline: "Assumption register",
    blocks: c.assumptions.length
      ? [{ type: "table", headers: ["Assumption", "Impact", "Confidence", "Validate?"], rows: c.assumptions.map((a) => [a.statement, cap(a.impact), cap(a.confidence), a.validate ? `Yes${a.howToValidate ? ` — ${a.howToValidate}` : ""}` : "No"]) }]
      : [],
  });

  add({
    id: "legend",
    title: "Appendix B. How to read this report",
    headline: "Facts, inferences, assumptions",
    blocks: [
      {
        type: "bullets",
        items: [
          "Fact — provided by the client or verified data.",
          "Inference — derived by analysis from available evidence.",
          "Assumption — required because information is missing; must be validated.",
          "Recommendation — proposed action, prioritised as Impact × Confidence × Strategic Fit ÷ Effort.",
          "All economics are modelled estimates, not guaranteed results.",
        ],
      },
    ],
  });

  return {
    title: c.name,
    subtitle: industry ? `${industry.name} · Marketing Strategy & Diagnostic` : "Marketing Strategy & Diagnostic",
    companyName: brand.companyName,
    generatedAt: r?.generatedAt ?? new Date().toISOString(),
    brand,
    sections,
  };
}

function statusLabel(s: string) {
  return { proposed: "Awaiting review", agreed: "Agreed", partially_agreed: "Partially agreed", disagreed: "Rejected" }[s] ?? s;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function zip3(a: string[], b: string[], c: string[]): string[][] {
  const n = Math.max(a.length, b.length, c.length);
  return Array.from({ length: n }, (_, i) => [a[i] ?? "", b[i] ?? "", c[i] ?? ""]);
}
