import { describe, expect, it } from "vitest";
import { coachLine } from "./interviewCoach";

describe("interview coach", () => {
  it("greets by name with the question count at the start", () => {
    const l = coachLine({ name: "Naman", answered: 0, remaining: 15, ready: false, critical: true });
    expect(l.headline).toContain("Naman");
    expect(l.detail).toContain("15");
  });
  it("counts down and celebrates milestones", () => {
    expect(coachLine({ name: "Naman", answered: 4, remaining: 7, ready: false, critical: false, last: "answered" }).detail).toContain("7 more questions to go");
    expect(coachLine({ name: "Naman", answered: 8, remaining: 7, ready: false, critical: false, last: "answered" }).headline).toContain("Halfway");
    expect(coachLine({ name: "Naman", answered: 12, remaining: 1, ready: false, critical: false, last: "answered" }).detail).toContain("Just 1 more");
    expect(coachLine({ name: "Naman", answered: 9, remaining: 0, ready: true, critical: false }).headline).toContain("everything");
  });
  it("is kind about skips and varies its wording", () => {
    expect(coachLine({ name: "Naman", answered: 3, remaining: 9, ready: false, critical: false, last: "skipped" }).headline).toMatch(/problem|fine|okay/i);
    const lines = new Set([2, 3, 4, 5].map((n) => coachLine({ name: "Naman", answered: n, remaining: 20, ready: false, critical: false, last: "answered" }).headline));
    expect(lines.size).toBeGreaterThan(2);
  });
});
