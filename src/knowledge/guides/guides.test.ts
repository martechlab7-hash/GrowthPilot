import { describe, expect, it } from "vitest";
import { FRAMEWORKS } from "../frameworks";
import { FRAMEWORK_GUIDES } from "./index";

const ids = new Set(FRAMEWORKS.map((f) => f.id));

describe("framework guides", () => {
  it("exist for every framework and only for known frameworks", () => {
    expect(FRAMEWORKS.filter((f) => !FRAMEWORK_GUIDES[f.id]).map((f) => f.id)).toEqual([]);
    expect(Object.keys(FRAMEWORK_GUIDES).filter((k) => !ids.has(k))).toEqual([]);
  });

  for (const [id, g] of Object.entries(FRAMEWORK_GUIDES)) {
    it(`${id} is complete and its charts are well-formed`, () => {
      expect(g.overview.length).toBeGreaterThanOrEqual(2);
      expect(g.whenToUse.length).toBeGreaterThanOrEqual(3);
      expect(g.howItWorks.length).toBeGreaterThanOrEqual(4);
      expect(g.examples.length).toBeGreaterThanOrEqual(2);
      expect(g.visuals.length).toBeGreaterThanOrEqual(1);
      expect(g.keyMetrics.length).toBeGreaterThanOrEqual(3);
      expect(g.pitfalls.length).toBeGreaterThanOrEqual(3);
      expect(g.plainWords.length).toBeGreaterThan(80);
      expect(g.plainWords).not.toMatch(/\b(child|children|kid|kids|school|five-year|5-year|year-old)\b/i);
      expect(g.related.filter((r) => !ids.has(r) || r === id)).toEqual([]);
      for (const v of g.visuals) {
        if (v.type === "line") for (const s of v.series) expect(s.points.length).toBe(v.xLabels.length);
        if (v.type === "matrix") for (const p of v.points ?? []) expect(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100).toBe(true);
        if (v.type === "funnel") expect(v.stages.length).toBeGreaterThanOrEqual(3);
        if (v.type === "cycle") expect(v.steps.length).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
