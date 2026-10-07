import { describe, expect, it } from "vitest";
import { fmt } from "./GuideCharts";

describe("guide chart unit formatting", () => {
  it("handles currency, percent and word units", () => {
    expect(fmt(100, "£m")).toBe("£100m");
    expect(fmt(-3.4, "£m")).toBe("−£3.4m");
    expect(fmt(28, "% of intervals")).toBe("28% of intervals");
    expect(fmt(12000, "$")).toBe("$12,000");
    expect(fmt(9, "journeys")).toBe("9 journeys");
    expect(fmt(5)).toBe("5");
  });
});
