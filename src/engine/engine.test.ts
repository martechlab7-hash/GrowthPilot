import { describe, expect, it } from "vitest";
import type { Case } from "@/domain/types";
import { classifyProblem } from "./classify";
import { emptyContext, markUnknown, setField } from "./context";
import { computeEconomics, computeScenario } from "./economics";
import { selectFrameworks } from "./frameworkSelection";
import { MIN_PRIORITY, nextQuestions, readiness, scoreQuestion, sufficiencyStatements } from "./interview";
import { assessMaturity } from "./maturity";
import { maskPii, restorePii } from "./pii";
import { classifyPriority, priorityScore } from "./prioritization";
import { QUESTION_BANK } from "@/knowledge/questionBank";

type IC = Pick<Case, "context" | "problemTypes" | "industryId" | "adaptiveQuestions">;
const base = (over: Partial<IC> = {}): IC => ({ context: emptyContext(), problemTypes: ["retention"], industryId: "airline", adaptiveQuestions: [], ...over });

describe("information value engine", () => {
  it("asks the highest-value unknown questions first", () => {
    const qs = nextQuestions(base(), 3);
    expect(qs).toHaveLength(3);
    expect(qs[0]!.priority).toBeGreaterThanOrEqual(qs[1]!.priority);
    expect(qs.every((q) => q.priority >= MIN_PRIORITY)).toBe(true);
  });

  it("never re-asks a known fact or a declared unknown", () => {
    let ctx = setField(emptyContext(), { key: "business.industry", value: "Airlines", by: "u" });
    ctx = markUnknown(ctx, "business.business_model");
    const ids = nextQuestions(base({ context: ctx }), 50).map((q) => q.id);
    expect(ids).not.toContain("biz-industry");
    expect(ids).not.toContain("biz-model");
  });

  it("re-asks to confirm an inference at reduced priority", () => {
    const q = QUESTION_BANK.find((x) => x.id === "biz-industry")!;
    const inferred = setField(emptyContext(), { key: "business.industry", value: "Airlines", source: "ai_inference", by: "s" });
    expect(scoreQuestion(q, base({ context: inferred })).uncertainty).toBe(0.5);
  });

  it("filters industry- and problem-specific questions", () => {
    const airline = nextQuestions(base(), 100).map((q) => q.id);
    const saas = nextQuestions(base({ industryId: "saas", problemTypes: ["conversion"] }), 100).map((q) => q.id);
    expect(airline).toContain("cust-travel-purpose");
    expect(saas).not.toContain("cust-travel-purpose");
    expect(saas).toContain("perf-funnel-stage");
    expect(airline).not.toContain("perf-funnel-stage");
  });

  it("gates readiness on critical questions and states sufficiency", () => {
    expect(readiness(base()).ready).toBe(false);
    let ctx = emptyContext();
    for (const q of QUESTION_BANK.filter((x) => x.stage === "business")) {
      ctx = setField(ctx, { key: q.key, value: q.options?.[0] ?? (q.input === "multiselect" ? ["x"] : q.input.match(/number|percent|currency/) ? 1 : "x"), by: "u" });
    }
    expect(sufficiencyStatements(base({ context: ctx }))[0]).toMatch(/enough information on business objective/i);
  });
});

describe("economics engine", () => {
  it("reproduces the spec example: 500,000 × 8% × 4,000 = 160M", () => {
    const s = computeScenario({ currency: "INR", eligibleCustomers: 500_000, averageAnnualValue: 4000, grossMarginPct: 30, investment: 10_000_000, monthlyRunCost: 500_000, scenarioLifts: { conservative: 5, base: 8, aggressive: 20 } }, "base", 8);
    expect(s.customersImpacted).toBe(40_000);
    expect(s.incrementalRevenue).toBe(160_000_000);
    expect(s.incrementalGrossProfit).toBe(48_000_000);
    expect(s.programCost).toBe(16_000_000);
    expect(s.netProfit).toBe(32_000_000);
    expect(s.roi).toBe(2);
    expect(s.paybackMonths).toBe(2.9);
  });

  it("reports no payback when monthly profit does not cover run cost", () => {
    const e = computeEconomics({ currency: "USD", eligibleCustomers: 100, averageAnnualValue: 10, grossMarginPct: 10, investment: 1000, monthlyRunCost: 100, scenarioLifts: { conservative: 5, base: 10, aggressive: 20 } }, {});
    expect(e.scenarios.map((s) => s.paybackMonths)).toEqual([null, null, null]);
    expect(e.disclaimer).toMatch(/not guaranteed/);
  });
});

describe("prioritisation", () => {
  it("scores Impact × Confidence × Fit ÷ Effort and classifies P0–P3", () => {
    expect(priorityScore({ impactScore: 5, confidence: 0.8, strategicFit: 5, effortScore: 2, timeToValueWeeks: 4 })).toBe(10);
    expect(classifyPriority({ impactScore: 5, confidence: 0.8, strategicFit: 5, effortScore: 2, timeToValueWeeks: 4 })).toBe("P0");
    expect(classifyPriority({ impactScore: 5, confidence: 0.8, strategicFit: 5, effortScore: 2, timeToValueWeeks: 30 })).toBe("P1");
    expect(classifyPriority({ impactScore: 2, confidence: 0.5, strategicFit: 2, effortScore: 4, timeToValueWeeks: 4 })).toBe("P3");
  });
});

describe("classification & frameworks", () => {
  it("classifies retention problems and selects retention frameworks", () => {
    const types = classifyProblem("Our airline has seen a decline in repeat bookings and retention");
    expect(types[0]).toBe("retention");
    const ids = selectFrameworks({ problemStatement: "repeat bookings decline retention", problemTypes: types, industryId: "airline" }).map((m) => m.framework.id);
    expect(ids).toContain("cohort");
    expect(ids).not.toContain("ux-diagnosis");
  });

  it("selects UX/funnel frameworks for a post-redesign conversion drop", () => {
    const text = "Conversion dropped after a website redesign";
    const ids = selectFrameworks({ problemStatement: text.toLowerCase(), problemTypes: classifyProblem(text) }).map((m) => m.framework.id);
    expect(ids).toEqual(expect.arrayContaining(["funnel", "ux-diagnosis"]));
  });
});

describe("maturity", () => {
  it("scores only what was answered", () => {
    expect(assessMaturity(emptyContext()).level).toBe(1);
    let ctx = setField(emptyContext(), { key: "technology.stack", value: ["CRM", "CDP", "Marketing automation", "Data warehouse"], by: "u" });
    ctx = setField(ctx, { key: "marketing.campaign_style", value: "Automated lifecycle triggers", by: "u" });
    const m = assessMaturity(ctx);
    expect(m.dimensions.find((d) => d.dimension === "Activation")!.score).toBe(3.5);
    expect(m.basedOnFields).toBe(2);
  });
});

describe("PII masking", () => {
  it("masks and restores emails and phone numbers but keeps business numbers", () => {
    const text = "Contact jane@acme.com or +91 98765 43210. Retention fell from 42% to 37% across 500,000 customers in 2024.";
    const { text: masked, vault } = maskPii(text);
    expect(masked).not.toContain("jane@acme.com");
    expect(masked).not.toContain("98765");
    expect(masked).toContain("500,000");
    expect(masked).toContain("2024");
    expect(restorePii(masked, vault)).toBe(text);
  });
});

describe("martech vendors", () => {
  it("infer capabilities for maturity from named vendors", () => {
    const ctx = setField(emptyContext(), { key: "technology.vendors", value: ["Braze", "Segment (Twilio)", "Snowflake"], by: "u" });
    const tech = assessMaturity(ctx).dimensions.find((d) => d.dimension === "Technology")!;
    expect(tech.score).toBeGreaterThan(2);
    expect(tech.rationale).toContain("Braze");
  });
});

describe("questions to ready", () => {
  it("is a small, honest target that reaches zero once ready", async () => {
    const { questionsToReady, readiness: rd } = await import("./interview");
    const { emptyContext: ec } = await import("./context");
    const c = { context: ec(), problemTypes: ["retention"] as never, industryId: "airline", adaptiveQuestions: [] };
    const n = questionsToReady(c);
    expect(n).toBeGreaterThan(3);
    expect(n).toBeLessThan(30);
    expect(rd(c).ready).toBe(false);
  });
});
