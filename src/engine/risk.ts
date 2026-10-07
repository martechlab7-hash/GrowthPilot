import type { EconomicsInputs } from "@/domain/types";
import { computeScenario } from "./economics";

/**
 * Decision analytics for the business case (deterministic and seeded, so
 * every run gives the same answer): break-even lift, one-at-a-time
 * sensitivity (tornado) and a Monte Carlo view of the odds of paying back.
 */
const HORIZON = 12;
const programCost = (i: EconomicsInputs) => i.investment + i.monthlyRunCost * HORIZON;
const net = (i: EconomicsInputs, liftPct: number) => computeScenario(i, "base", liftPct).netProfit;

/** The lift at which 12-month net profit is zero. Null when value per unit or margin is zero. */
export function breakEvenLift(i: EconomicsInputs): number | null {
  const perPoint = i.eligibleCustomers * i.averageAnnualValue * (i.grossMarginPct / 100) / 100;
  if (perPoint <= 0) return null;
  return Math.round((programCost(i) / perPoint) * 100) / 100;
}

export interface Sensitivity {
  driver: string;
  low: number;
  high: number;
  swing: number;
}

/** Net profit when each driver alone moves ±20% (lift uses the conservative and aggressive scenarios). */
export function sensitivity(i: EconomicsInputs): Sensitivity[] {
  const base = i.scenarioLifts.base;
  const vary = (patch: (f: number) => Partial<EconomicsInputs>, label: string): Sensitivity => {
    const lo = net({ ...i, ...patch(0.8) }, base);
    const hi = net({ ...i, ...patch(1.2) }, base);
    return { driver: label, low: Math.min(lo, hi), high: Math.max(lo, hi), swing: Math.abs(hi - lo) };
  };
  const rows: Sensitivity[] = [
    (() => {
      const lo = net(i, i.scenarioLifts.conservative);
      const hi = net(i, i.scenarioLifts.aggressive);
      return { driver: "Lift (conservative ↔ aggressive)", low: lo, high: hi, swing: Math.abs(hi - lo) };
    })(),
    vary((f) => ({ eligibleCustomers: i.eligibleCustomers * f }), "Volume ±20%"),
    vary((f) => ({ averageAnnualValue: i.averageAnnualValue * f }), "Value per unit ±20%"),
    vary((f) => ({ grossMarginPct: Math.min(100, i.grossMarginPct * f) }), "Gross margin ±20%"),
    vary((f) => ({ investment: i.investment * (2 - f) }), "Investment ±20%"),
    vary((f) => ({ monthlyRunCost: i.monthlyRunCost * (2 - f) }), "Run cost ±20%"),
  ];
  return rows.filter((r) => r.swing > 0).sort((a, b) => b.swing - a.swing);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const triangular = (u: number, a: number, c: number, b: number) => {
  if (b <= a) return c;
  const f = (c - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
};

export interface RiskProfile {
  runs: number;
  probPositive: number;
  probPayback12: number;
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Monte Carlo: lift drawn from a triangular distribution over the three
 * scenarios; volume and value ±10%, margin ±5% (uniform). Seeded.
 */
export function monteCarlo(i: EconomicsInputs, runs = 2000, seed = 42): RiskProfile {
  const rnd = mulberry32(seed);
  const { conservative, base, aggressive } = i.scenarioLifts;
  const lo = Math.min(conservative, base, aggressive), hi = Math.max(conservative, base, aggressive);
  const out: number[] = [];
  let payback = 0;
  for (let k = 0; k < runs; k++) {
    const lift = triangular(rnd(), lo, Math.min(Math.max(base, lo), hi), hi);
    const sim: EconomicsInputs = {
      ...i,
      eligibleCustomers: i.eligibleCustomers * (0.9 + rnd() * 0.2),
      averageAnnualValue: i.averageAnnualValue * (0.9 + rnd() * 0.2),
      grossMarginPct: Math.min(100, i.grossMarginPct * (0.95 + rnd() * 0.1)),
    };
    const s = computeScenario(sim, "base", lift);
    out.push(s.netProfit);
    if (s.paybackMonths !== null && s.paybackMonths <= HORIZON) payback++;
  }
  out.sort((a, b) => a - b);
  const q = (p: number) => Math.round(out[Math.min(out.length - 1, Math.floor(p * out.length))]!);
  return {
    runs,
    probPositive: Math.round((out.filter((x) => x > 0).length / runs) * 100) / 100,
    probPayback12: Math.round((payback / runs) * 100) / 100,
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
  };
}
