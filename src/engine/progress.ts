import type { Case, Stage } from "@/domain/types";
import { stageCoverage, STAGE_LABELS } from "./interview";

export interface StageProgress {
  stage: Stage;
  label: string;
  percent: number;
  state: "complete" | "in_progress" | "pending";
}

/**
 * Workspace progress per B-D-C-D-T-A-M-E stage. Discovery stages are driven
 * by information coverage; later stages complete when their outputs exist.
 */
export function stageProgress(c: Case): StageProgress[] {
  const coverage = new Map(stageCoverage(c).map((s) => [s.stage, s]));
  const outputDone: Partial<Record<Stage, boolean>> = {
    diagnosis: !!c.diagnosis,
    activation: c.journeys.length > 0,
    measurement: !!c.measurement,
    economics: !!c.economics,
  };
  return (Object.keys(STAGE_LABELS) as Stage[]).map((stage) => {
    const cov = coverage.get(stage);
    const info = cov ? cov.coverage : 0;
    let percent: number;
    if (stage in outputDone) {
      percent = outputDone[stage] ? 100 : Math.round(info * 60);
    } else {
      percent = cov && cov.remainingHighValue === 0 && cov.known > 0 ? 100 : Math.round(info * 100);
    }
    return {
      stage,
      label: STAGE_LABELS[stage],
      percent,
      state: percent >= 100 ? "complete" : percent > 0 ? "in_progress" : "pending",
    };
  });
}

/** Overall case progress across the full consulting lifecycle. */
export function overallProgress(c: Case): number {
  const stages = stageProgress(c);
  const discovery = stages
    .filter((s) => ["business", "customer", "data", "technology"].includes(s.stage))
    .reduce((sum, s) => sum + s.percent, 0) / 4;
  const reviewed = c.hypotheses.length > 0 && c.hypotheses.every((h) => h.status !== "proposed");
  let p = discovery * 0.35;
  if (c.diagnosis) p += 10;
  if (c.hypotheses.length) p += 5;
  if (reviewed) p += 10;
  if (c.recommendations.length) p += 15;
  if (c.journeys.length || c.measurement) p += 10;
  if (c.economics) p += 5;
  // A generated report closes the lifecycle, even if optional discovery questions remain.
  if (c.report) return 100;
  return Math.min(99, Math.round(p));
}
