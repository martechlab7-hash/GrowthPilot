import { describe, expect, it } from "vitest";
import { emptyContext, setField } from "./context";
import { assessHypothesis, verifyEvidence } from "./verify";

const ctx = setField(setField(emptyContext(), { key: "performance.metric_current", value: 31, by: "u" }), {
  key: "business.industry", value: "Airlines", source: "ai_inference", kind: "inference", confidence: "medium", by: "system",
});
const c = { context: ctx, datasets: [{ id: "d", name: "Bookings by route", kind: "table" as const, sizeBytes: 1, createdAt: "", createdBy: "u", maskedColumns: [], removedColumns: [] }] };

describe("evidence verifier", () => {
  it("keeps verified facts and downgrades unsupported ones", () => {
    const r = verifyEvidence(c, [
      { statement: "Repeat rate is 31%", kind: "fact", sourceKeys: ["performance.metric_current"] },
      { statement: "Made up figure", kind: "fact", sourceKeys: ["performance.nonexistent"] },
      { statement: "Industry is airlines", kind: "fact", sourceKeys: ["business.industry"] },
      { statement: "Route DEL-BOM fell", kind: "fact", sourceKeys: ["shared_data:Bookings by route"] },
    ]);
    expect(r.items.map((e) => e.kind)).toEqual(["fact", "assumption", "inference", "fact"]);
    expect(r.items[1]!.sourceKeys).toEqual([]);
    expect(r).toMatchObject({ verifiedFacts: 2, downgraded: 2, dataBacked: true });
  });

  it("scores by rules: weak evidence and a refuted debate pull confidence down", () => {
    const strong = assessHypothesis(c, { confidence: 0.7, evidence: [{ statement: "x", kind: "fact", sourceKeys: ["performance.metric_current"] }] });
    const weak = assessHypothesis(c, { confidence: 0.7, evidence: [{ statement: "x", kind: "fact", sourceKeys: [] }] });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(weak.basis.join(" ")).toContain("downgraded");
    const refuted = assessHypothesis(c, {
      confidence: 0.7,
      evidence: [{ statement: "x", kind: "fact", sourceKeys: ["performance.metric_current"] }],
      debate: { challenges: [], defense: { argument: "", evidence: [] }, verdict: { outcome: "refuted", confidence: 0.8, reasoning: "", settleWith: [] }, at: "" },
    });
    expect(refuted.score).toBeLessThan(strong.score);
  });
});
