/**
 * Long-form framework guides shown from the "i" button on every framework.
 * Pure data, lazily loaded on the client so the main bundle stays small.
 */

/** Small illustrative charts rendered as SVG. Numbers are illustrative only. */
export type GuideVisual =
  | { type: "funnel"; title: string; caption: string; stages: { label: string; value: number }[] }
  | { type: "line"; title: string; caption: string; xLabels: string[]; yLabel: string; series: { name: string; points: number[] }[] }
  | { type: "bars"; title: string; caption: string; unit?: string; items: { label: string; value: number; highlight?: boolean }[] }
  | { type: "matrix"; title: string; caption: string; xLabel: string; yLabel: string; quadrants: [topLeft: string, topRight: string, bottomLeft: string, bottomRight: string]; points?: { label: string; x: number; y: number }[] }
  | { type: "cycle"; title: string; caption: string; steps: string[] }
  | { type: "waterfall"; title: string; caption: string; unit?: string; items: { label: string; value: number; total?: boolean }[] };

export interface FrameworkGuide {
  /** What the framework is: 2–3 short paragraphs. */
  overview: string[];
  /** When to reach for it: concrete situations / symptoms. */
  whenToUse: string[];
  /** How it works, step by step, each with an explanation. */
  howItWorks: { step: string; detail: string }[];
  /** The idea in very simple everyday language with an everyday analogy (2–4 sentences). */
  plainWords: string;
  /** Worked marketing examples. */
  examples: { title: string; situation: string; analysis: string; outcome: string }[];
  /** 1–2 illustrative charts. */
  visuals: GuideVisual[];
  /** Metrics / formulas to know. */
  keyMetrics: { name: string; formula?: string; meaning: string }[];
  /** Common mistakes. */
  pitfalls: string[];
  /** Ids of related frameworks in the library. */
  related: string[];
}
