import { describe, expect, it } from "vitest";
import { fillPlaceholders, metricFromStatement, vocabularyFor } from "./vocabulary";

describe("problem vocabulary", () => {
  it("pulls the metric out of common problem statements", () => {
    expect(metricFromStatement("Our airline has seen a decline in repeat bookings over the last 12 months.")).toBe("repeat bookings");
    expect(metricFromStatement("Email open rate dropped by 15% since March")).toBe("email open rate");
    expect(metricFromStatement("We want to improve customer retention in Europe")).toBe("customer retention");
    expect(metricFromStatement("Low app activation after signup")).toBe("app activation");
    expect(metricFromStatement("Things are bad")).toBeUndefined();
  });
  it("uses industry words", () => {
    const v = vocabularyFor("airline");
    expect(fillPlaceholders("How often does a typical {customer} {purchaseVerb}? Which {customer} groups…", v, "repeat bookings")).toBe("How often does a typical passenger book a flight? Which passenger groups…");
    expect(fillPlaceholders("What is {metric} today?", vocabularyFor(undefined), undefined)).toBe("What is the affected metric today?");
  });
});
