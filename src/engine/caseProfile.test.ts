import { describe, expect, it } from "vitest";
import type { Case } from "@/domain/types";
import { emptyContext, setField } from "./context";
import { CHANNEL_KEY, CHANNEL_OPTIONS, detectChannel, detectGoal, GOAL_KEY, GOAL_OPTIONS, type CaseGoal, type SalesChannel } from "./caseProfile";
import { classifyProblem } from "./classify";
import { nextQuestions, readiness } from "./interview";

describe("goal detection", () => {
  it.each([
    ["Revenue dropped from 12 Cr to 9 Cr this year", "decline"],
    ["Our airline has seen a decline in repeat bookings over the last 12 months.", "decline"],
    ["Store sales fell 15% since March", "decline"],
    ["Footfall went from 2,000 to 1,400 a week", "decline"],
    ["We want a strategy to grow revenue by 5% next year", "growth"],
    ["Increase average order value across our stores", "growth"],
    ["Help us hit our target of 50 Cr in sales", "growth"],
    ["Sales went from 80 to 100 units; we want to accelerate further", "growth"],
    ["Repeat purchases dropped 10%, and we also want to grow 20% beyond last year's target", "both"],
    ["Customer retention strategy", undefined],
  ])("%s → %s", (text, goal) => expect(detectGoal(text)).toBe(goal));
});

describe("channel detection", () => {
  it.each([
    ["We run 40 apparel stores across Gujarat", "offline"],
    ["Our dealers and distributors are selling less", "offline"],
    ["Footfall in our showrooms is down", "offline"],
    ["Website checkout conversion dropped", "online"],
    ["App installs are flat", "online"],
    ["We sell online and offline through our own stores and website", "omni"],
    ["Customer retention strategy", undefined],
  ])("%s → %s", (text, channel) => expect(detectChannel(text)).toBe(channel));
});

function caseFor(statement: string, goal?: CaseGoal, channel?: SalesChannel): Case {
  let ctx = emptyContext();
  if (goal) ctx = setField(ctx, { key: GOAL_KEY, value: GOAL_OPTIONS[goal], by: "u" });
  if (channel) ctx = setField(ctx, { key: CHANNEL_KEY, value: CHANNEL_OPTIONS[channel], by: "u" });
  ctx = setField(ctx, { key: "business.industry", value: "Retail", by: "u" });
  return { problemStatement: statement, problemTypes: classifyProblem(statement), industryId: "retail", context: ctx, adaptiveQuestions: [] } as unknown as Case;
}
const ids = (c: Case) => nextQuestions(c, 500).map((q) => q.id);

describe("interview follows the goal and the sales channel", () => {
  it("offline growth: no decline, website, app or martech questions", () => {
    const c = caseFor("We run 40 apparel stores. We want a strategy to grow revenue by 5% next year.", "growth", "offline");
    const qs = ids(c);
    for (const id of ["perf-onset", "perf-uniform", "perf-recent-changes", "cust-declining", "perf-funnel-stage", "mkt-links", "tech-vendors", "tech-stack", "data-identity", "app-funnel", "seo-trend", "mkt-style"]) expect(qs, id).not.toContain(id);
    for (const id of ["growth-target", "growth-levers", "growth-constraints", "off-network", "off-systems", "off-footfall", "off-store-variance", "off-capture"]) expect(qs, id).toContain(id);
    const all = nextQuestions(c, 500);
    expect(all.find((q) => q.id === "off-footfall")!.prompt).toMatch(/easiest to grow/);
    expect(all.find((q) => q.id === "perf-current")!.prompt).toMatch(/baseline/);
    expect(all.find((q) => q.id === "mkt-channels")!.options).toContain("Flyers / pamphlets");
    expect(all.find((q) => q.id === "mkt-channels")!.options).not.toContain("Paid search");
    // Readiness needs the growth essentials, not decline onset.
    expect(readiness(c).missingCritical.map((m) => m.id)).toEqual(expect.arrayContaining(["growth-target", "growth-levers", "off-network"]));
    expect(readiness(c).missingCritical.map((m) => m.id)).not.toContain("perf-onset");
  });

  it("online decline keeps the diagnostic flow", () => {
    const qs = ids(caseFor("Website checkout conversion dropped from 3.2% to 2.1% since March.", "decline", "online"));
    for (const id of ["perf-onset", "perf-uniform", "perf-funnel-stage", "tech-vendors"]) expect(qs, id).toContain(id);
    for (const id of ["growth-target", "growth-levers", "off-network", "off-footfall"]) expect(qs, id).not.toContain(id);
  });

  it("recover-then-grow and omnichannel combine both sets", () => {
    const qs = ids(caseFor("Store and online sales fell; we want to recover and then grow 10%.", "both", "omni"));
    for (const id of ["perf-onset", "growth-target", "off-network", "tech-vendors"]) expect(qs, id).toContain(id);
  });

  it("messaging questions only appear when the client messages customers", () => {
    const c = caseFor("Repeat visits to our stores dropped 20%.", "decline", "offline");
    expect(ids(c)).not.toContain("mkt-cadence");
    c.context = setField(c.context, { key: "marketing.channels", value: ["Flyers / pamphlets", "WhatsApp"], by: "u" });
    expect(ids(c)).toContain("mkt-cadence");
  });
});
