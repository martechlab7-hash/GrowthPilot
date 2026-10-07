import { describe, expect, it } from "vitest";
import type { EconomicsInputs } from "@/domain/types";
import { breakEvenLift, monteCarlo, sensitivity } from "./risk";
import { designExperiment } from "./experiment";

const inputs: EconomicsInputs = {
  currency: "INR", eligibleCustomers: 100_000, averageAnnualValue: 4000, grossMarginPct: 30,
  investment: 2_000_000, monthlyRunCost: 500_000, scenarioLifts: { conservative: 3, base: 6, aggressive: 10 },
};

describe("business-case risk", () => {
  it("finds the break-even lift", () => {
    // cost 8M; each lift point = 100k × 4000 × 30% / 100 = 1.2M → 6.67%
    expect(breakEvenLift(inputs)).toBe(6.67);
    expect(breakEvenLift({ ...inputs, grossMarginPct: 0 })).toBeNull();
  });
  it("ranks drivers by how much they swing net profit", () => {
    const s = sensitivity(inputs);
    expect(s[0]!.driver).toMatch(/Lift/);
    expect(s.every((r, i) => i === 0 || r.swing <= s[i - 1]!.swing)).toBe(true);
  });
  it("gives reproducible odds", () => {
    const a = monteCarlo(inputs), b = monteCarlo(inputs);
    expect(a).toEqual(b);
    expect(a.probPositive).toBeGreaterThan(0.2);
    expect(a.probPositive).toBeLessThan(0.8);
    expect(a.p10).toBeLessThan(a.p50);
    expect(a.p50).toBeLessThan(a.p90);
  });
});

describe("experiment designer", () => {
  it("matches the standard sample-size formula for an equal split", () => {
    const p = designExperiment({ baselinePct: 10, mdeRelativePct: 20, weeklyAudience: 2000, controlPct: 50 })!;
    // 10% → 12%, 95%/80%: ≈ 3,841 per arm
    expect(p.perArmTreatment).toBeGreaterThan(3800);
    expect(p.perArmTreatment).toBeLessThan(3900);
    expect(p.weeks).toBe(Math.ceil(p.total / 2000));
    expect(p.targetPct).toBe(12);
  });
  it("needs more total sample with a small holdout", () => {
    const even = designExperiment({ baselinePct: 5, mdeRelativePct: 10, weeklyAudience: 10_000, controlPct: 50 })!;
    const small = designExperiment({ baselinePct: 5, mdeRelativePct: 10, weeklyAudience: 10_000, controlPct: 10 })!;
    expect(small.total).toBeGreaterThan(even.total);
    expect(designExperiment({ baselinePct: 0, mdeRelativePct: 10, weeklyAudience: 1, controlPct: 10 })).toBeNull();
  });
});
