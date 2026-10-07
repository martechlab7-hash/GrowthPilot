/**
 * Experiment designer: sample size for a two-arm test on a conversion-type
 * metric (two-sided, normal approximation), duration and minimum detectable
 * effect. Deterministic.
 */
const Z: Record<string, number> = { "0.9": 1.6449, "0.95": 1.96, "0.99": 2.5758, "0.8": 0.8416, "0.85": 1.0364 };

export interface ExperimentInput {
  /** Baseline rate as a percentage, e.g. 4 for 4%. */
  baselinePct: number;
  /** Minimum detectable effect, relative %, e.g. 10 = 4.0% → 4.4%. */
  mdeRelativePct: number;
  /** Eligible audience per week entering the test. */
  weeklyAudience: number;
  /** Share of the audience held out as control, %. */
  controlPct: number;
  confidence?: 0.9 | 0.95 | 0.99;
  power?: 0.8 | 0.85 | 0.9;
}

export interface ExperimentPlan {
  perArmControl: number;
  perArmTreatment: number;
  total: number;
  weeks: number | null;
  targetPct: number;
  absoluteLiftPts: number;
  summary: string;
}

export function designExperiment(x: ExperimentInput): ExperimentPlan | null {
  const p1 = x.baselinePct / 100;
  const p2 = p1 * (1 + x.mdeRelativePct / 100);
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1 && x.controlPct > 0 && x.controlPct < 100)) return null;
  const za = Z[String(x.confidence ?? 0.95)]!;
  const zb = Z[String(x.power ?? 0.8)]!;
  const k = x.controlPct / (100 - x.controlPct); // control size relative to treatment
  // Unequal allocation: n_t = (za*sqrt(pbar*qbar*(1+1/k)) + zb*sqrt(p1q1/k + p2q2))^2 / (p2-p1)^2
  const pbar = (k * p1 + p2) / (1 + k);
  const nt = Math.pow(za * Math.sqrt(pbar * (1 - pbar) * (1 + 1 / k)) + zb * Math.sqrt((p1 * (1 - p1)) / k + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2);
  const perArmTreatment = Math.ceil(nt);
  const perArmControl = Math.ceil(nt * k);
  const total = perArmTreatment + perArmControl;
  const weeks = x.weeklyAudience > 0 ? Math.max(1, Math.ceil(total / x.weeklyAudience)) : null;
  const targetPct = Math.round(p2 * 10000) / 100;
  const absoluteLiftPts = Math.round((p2 - p1) * 10000) / 100;
  const summary = `To detect a move from ${x.baselinePct}% to ${targetPct}% (${x.mdeRelativePct}% relative) with ${Math.round((x.confidence ?? 0.95) * 100)}% confidence and ${Math.round((x.power ?? 0.8) * 100)}% power, you need ${perArmTreatment.toLocaleString("en")} in treatment and ${perArmControl.toLocaleString("en")} in control${weeks ? `, about ${weeks} week${weeks > 1 ? "s" : ""} at your volume` : ""}.`;
  return { perArmControl, perArmTreatment, total, weeks, targetPct, absoluteLiftPts, summary };
}
