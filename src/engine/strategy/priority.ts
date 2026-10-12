import type { StrategyRecommendation } from "@/domain/types";

/**
 * Ranking heuristic (not a forecast):
 *
 *   Priority = (Impact × Confidence × Strategic fit) / (Effort × Risk)
 *
 * All factors on 1–5 scales (confidence 0–1 is mapped onto 1–5), with a floor
 * of 1 on the denominator terms so a single low score cannot dominate. The
 * result is normalised to 0–100 against the best possible score.
 */
const MAX = (5 * 5 * 5) / (1 * 1);

export function priorityScore(r: Pick<StrategyRecommendation, "impact" | "confidence" | "strategicFit" | "effort" | "risk">): number {
  const clamp = (n: number) => Math.min(5, Math.max(1, n));
  const confidence = clamp(1 + r.confidence * 4);
  const raw = (clamp(r.impact) * confidence * clamp(r.strategicFit)) / (clamp(r.effort) * clamp(r.risk));
  return Math.round((raw / MAX) * 1000) / 10;
}

/** A quick win: meaningful impact, low effort, and no new technology needed. */
export function isQuickWin(r: Pick<StrategyRecommendation, "impact" | "effort" | "needsNewTech">): boolean {
  return r.impact >= 3 && r.effort <= 2 && !r.needsNewTech;
}

/** Score, flag and rank recommendations; rejected ones keep their score but sink to the bottom. */
export function rankRecommendations<T extends StrategyRecommendation>(recs: T[]): T[] {
  const scored = recs.map((r) => ({ ...r, priority: priorityScore(r), quickWin: isQuickWin(r) }));
  const order = [...scored].sort((a, b) => Number(a.status === "rejected") - Number(b.status === "rejected") || b.priority - a.priority || a.title.localeCompare(b.title));
  return order.map((r, i) => ({ ...r, rank: i + 1 }));
}
