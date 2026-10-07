import { describe, expect, it } from "vitest";
import type { Question } from "@/domain/types";
import { answerWithOther } from "./cases";

const base = { id: "q", key: "k", stage: "customer", category: "CUSTOMER", prompt: "P", why: "w", businessImpact: 3, diagnosticValue: 3, decisionRelevance: 3 } as unknown as Question;
const multi = { ...base, input: "multiselect", options: ["A", "B", "Not sure"] } as Question;
const single = { ...base, input: "select", options: ["A", "B"] } as Question;

describe("Other answers", () => {
  it("adds free text next to picked options and drops 'Not sure'", () => {
    expect(answerWithOther(multi, ["A", "Not sure"], "All members")).toEqual(["A", "Other: All members"]);
    expect(answerWithOther(multi, undefined, "All members")).toEqual(["Other: All members"]);
  });
  it("replaces a single choice", () => {
    expect(answerWithOther(single, undefined, "Something else")).toBe("Other: Something else");
  });
  it("still validates normal answers", () => {
    expect(answerWithOther(single, "A", undefined)).toBe("A");
    expect(() => answerWithOther(single, "Z", undefined)).toThrow();
  });
});
