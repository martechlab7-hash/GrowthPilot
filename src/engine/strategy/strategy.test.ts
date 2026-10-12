import { describe, expect, it } from "vitest";
import type { Case, RoadmapTask, StrategyRecommendation } from "@/domain/types";
import { emptyContext, setField } from "../context";
import { budgetIssues, budgetTotals } from "./budget";
import { evaluateStrategy } from "./evaluate";
import { priorityScore, rankRecommendations } from "./priority";
import { strategyReadiness } from "./readiness";
import { schedule } from "./roadmap";

const task = (id: string, p: Partial<RoadmapTask> = {}): RoadmapTask => ({
  id, workstream: "CRM", title: id, owner: "CRM lead", weeks: 2, dependsOn: [], parallelizable: false, approval: false, deliverable: "x", launch: false, status: "todo", ...p,
});

describe("priority", () => {
  it("ranks by (impact × confidence × fit) / (effort × risk) with stable floors", () => {
    const strong = priorityScore({ impact: 5, confidence: 1, strategicFit: 5, effort: 1, risk: 1 });
    expect(strong).toBe(100);
    expect(priorityScore({ impact: 5, confidence: 0.9, strategicFit: 5, effort: 0, risk: 0 })).toBeLessThanOrEqual(100);
    const base = { id: "", pillarId: "", problem: "", evidence: "", evidenceKind: "estimated", rootCause: "", action: "", rationale: "", audience: "", channels: [], owner: "", timeline: "", budget: "", kpi: "", successCriteria: "", dependencies: [], risks: [], fallback: "", validateWith: "", priority: 0, rank: 0, whyPrioritized: "", quickWin: false, needsNewTech: false, status: "proposed" } as const;
    const ranked = rankRecommendations([
      { ...base, id: "a", title: "Big but hard", impact: 5, effort: 5, risk: 4, strategicFit: 4, confidence: 0.6 },
      { ...base, id: "b", title: "Quick win", impact: 4, effort: 1, risk: 1, strategicFit: 4, confidence: 0.7 },
      { ...base, id: "c", title: "Rejected", impact: 5, effort: 1, risk: 1, strategicFit: 5, confidence: 1, status: "rejected" },
    ] as unknown as StrategyRecommendation[]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(ranked[0]!.quickWin).toBe(true);
  });
});

describe("roadmap scheduler", () => {
  const tasks = [
    task("audit", { workstream: "Data", weeks: 2 }),
    task("journeys", { weeks: 3, parallelizable: true, dependsOn: ["audit"] }),
    task("creative", { workstream: "Creative", weeks: 3, parallelizable: true, approval: true }),
    task("launch", { weeks: 1, dependsOn: ["journeys", "creative"], launch: true }),
    task("scale", { weeks: 4, dependsOn: ["launch"], parallelizable: true }),
  ];
  const settings = { resources: "flexible" as const, horizon: "90d" as const };

  it("aggressive compresses only parallel work and never approvals; conservative adds pilot gates", () => {
    const a = schedule(tasks, { pace: "aggressive", settings, approvalWeeks: 2, startDate: "2027-01-04" });
    const b = schedule(tasks, { pace: "balanced", settings, approvalWeeks: 2, startDate: "2027-01-04" });
    const c = schedule(tasks, { pace: "conservative", settings, approvalWeeks: 2, startDate: "2027-01-04" });
    expect(a.totalWeeks).toBeLessThan(b.totalWeeks);
    expect(b.totalWeeks).toBeLessThan(c.totalWeeks);
    // Non-parallelisable work keeps its duration even when aggressive.
    const aAudit = a.tasks.find((t) => t.id === "audit")!;
    expect(aAudit.end - aAudit.start).toBe(2);
    // Approval time is not compressed: creative = 3 × 0.7 work + 2 approval.
    const aCreative = a.tasks.find((t) => t.id === "creative")!;
    expect(aCreative.end - aCreative.start).toBeCloseTo(4.1, 1);
    expect(c.tasks.some((t) => t.id === "launch-pilot" && t.generated)).toBe(true);
    expect(c.tasks.find((t) => t.id === "scale")!.dependsOn).toEqual(["launch-pilot"]);
    expect(b.criticalPath.at(-1)).toBe("scale");
    expect(b.criticalPath).toContain("launch");
  });

  it("does not compress anything with existing resources only", () => {
    const a = schedule(tasks, { pace: "aggressive", settings: { ...settings, resources: "existing" }, approvalWeeks: 1, startDate: "2027-01-04" });
    expect(a.tasks.find((t) => t.id === "journeys")!.end - a.tasks.find((t) => t.id === "journeys")!.start).toBe(3);
  });

  it("flags an unrealistic launch date and proposes trade-offs", () => {
    const s = schedule(tasks, { pace: "balanced", settings: { ...settings, launchDate: "2027-01-18" }, approvalWeeks: 2, startDate: "2027-01-04" });
    expect(s.issues.join(" ")).toMatch(/after the target date/);
    expect(s.tradeoffs[0]).toMatch(/Minimum viable launch/);
    expect(s.minimumViableLaunch.sort()).toEqual(["audit", "creative", "journeys", "launch"]);
  });

  it("survives unknown and circular dependencies", () => {
    const s = schedule([task("x", { dependsOn: ["y", "ghost"] }), task("y", { dependsOn: ["x"] })], { pace: "balanced", settings, startDate: "2027-01-04" });
    expect(s.tasks).toHaveLength(2);
    expect(s.issues.join(" ")).toMatch(/unknown task|Circular/);
  });
});

describe("budget and readiness", () => {
  it("totals in code and checks the ceiling", () => {
    let ctx = setField(emptyContext(), { key: "economics.monthly_budget", value: 100_000, by: "u" });
    const scenario = { pace: "balanced" as const, summary: "", scalingCriteria: [], lines: [
      { item: "Google Ads", category: "media" as const, oneTime: 0, monthly: 70_000 },
      { item: "CRM set-up", category: "technology" as const, oneTime: 50_000, monthly: 10_000 },
      { item: "Creative", category: "creative" as const, oneTime: 0, monthly: 30_000 },
    ], forecast: { metric: "Revenue", low: 1, base: 3, high: 2, assumptions: [] } };
    const t = budgetTotals(scenario);
    expect(t.monthly).toBe(110_000);
    expect(t.overMonths(3)).toBe(380_000);
    const issues = budgetIssues(scenario, ctx);
    expect(issues.join(" ")).toMatch(/above the stated ceiling/);
    expect(issues.join(" ")).toMatch(/out of order/);
    ctx = setField(ctx, { key: "measurement.tracking_quality", value: "Mostly manual spreadsheets", by: "u" });
    const r = strategyReadiness(ctx);
    expect(r.find((a) => a.area === "Data & tracking")!.missing).toContain("Single source of truth");
    expect(r.find((a) => a.area === "Audience clarity")!.note).toBe("Not discussed yet");
  });

  it("flags vague actions, excluded channels and missing measurement work", () => {
    const ctx = setField(setField(emptyContext(), { key: "marketing.channels_excluded", value: ["TikTok"], by: "u" }), { key: "measurement.tracking_quality", value: "Little or none", by: "u" });
    const rec = { id: "r", pillarId: "p", title: "Grow", problem: "", evidence: "", evidenceKind: "unknown", rootCause: "", action: "Improve retention", rationale: "", audience: "", channels: ["TikTok"], owner: "", timeline: "", budget: "", kpi: "", successCriteria: "", dependencies: [], risks: [], fallback: "", validateWith: "", impact: 3, effort: 3, risk: 3, strategicFit: 3, confidence: 0.9, priority: 0, rank: 1, whyPrioritized: "", quickWin: false, needsNewTech: false, status: "proposed" };
    const c = { context: ctx, strategy: { settings: { pace: "balanced", horizon: "90d", resources: "existing" }, recommendations: [rec], channelPlan: [], budget: [], tasks: [], kpis: [], measurementReadiness: [] } } as unknown as Case;
    const failed = evaluateStrategy(c).filter((x) => !x.ok).map((x) => x.id);
    expect(failed).toEqual(expect.arrayContaining(["complete", "actionable", "channels", "budget", "measurement", "evidence", "kpis"]));
  });
});
