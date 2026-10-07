import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIGateway } from "@/ai/gateway";
import type { ChatRequest, ProviderAdapter } from "@/ai/types";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import type { AuthContext } from "../auth";
import type { UserProfile } from "@/domain/types";

/* ---------------------------- fake AI provider ---------------------------- */

const prompts: string[] = [];
let failNext = false;

function fixture(req: ChatRequest): unknown {
  const sys = req.system;
  const prompt = req.messages[0]!.content;
  prompts.push(prompt);
  const ev = [{ statement: "Repeat bookings fell", kind: "fact", sourceKeys: ["performance.metric_current"] }];
  if (sys.includes("Extract structured facts")) return { facts: [{ key: "business.geography", value: "India", confidence: "high" }, { key: "business.industry", value: "Not an option", confidence: "high" }], problemTypes: ["retention"] };
  if (sys.includes("devil's-advocate debate")) {
    const ids = [...new Set(prompt.match(/hyp_[a-f0-9]{8}/g) ?? [])];
    return { debates: ids.map((id, i) => ({
      hypothesisId: id,
      challenges: [
        { panelistId: "statistician", argument: "Repeat bookings dip every winter; this may be seasonality.", alternative: "Seasonal dip", wouldChangeMind: "Same months last year were flat" },
        { panelistId: "not_a_panelist", argument: "ignored" },
      ],
      defense: { argument: "Last winter repeat rate held at 38%, so seasonality does not explain the drop.", evidence: ["Repeat rate fell"] },
      verdict: { outcome: i === 0 ? "survives" : "weakened", confidence: 0.7, reasoning: "Seasonality is ruled out by the prior-year comparison.", settleWith: ["Compare cohorts year on year"] },
    })) };
  }
  if (sys.includes("Interview Planner")) return { metric: "repeat bookings", focus: "We'll find which passengers stopped rebooking, and why.", questions: [
    { id: "perf-onset", relevant: true, prompt: "When did repeat bookings start to slide, and was the drop sudden or gradual?" },
    { id: "biz-geo", relevant: false },
    { id: "made-up-id", relevant: true, prompt: "Ignored because the id is unknown" },
  ] };
  if (sys.includes("Interview Agent")) return { consultantNote: "Need route data.", followUps: [{ slug: "route_mix", prompt: "Which routes declined?", why: "Isolates network effects", stage: "diagnosis", category: "PERFORMANCE", input: "longtext", businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4 }] };
  if (sys.includes("Diagnostic Agent")) return { thinking_summary: ["Compared frequent-flyer cohorts before and after March", "Ruled out seasonality: the dip persists year on year"], summary: "Decline concentrated in frequent flyers.", findings: [{ finding: "Frequent flyers book less", stage: "customer", evidence: ev, confidence: 0.7, impact: "high" }], confidence: 0.7, highConfidence: ["Repeat rate fell"], mediumConfidence: [], lowConfidence: ["Competitor pricing"], dataGaps: [{ dataset: "Competitor fares", whyNeeded: "Price effect", expectedInsight: "Elasticity", priority: "high", alternativeProxy: "Fare scraping" }], assumptions: [{ statement: "Fares unchanged", impact: "high", confidence: "low", validate: true }] };
  if (sys.includes("Hypothesis Agent")) return { hypotheses: [
    { statement: "Retention decline is driven by frequent flyers lapsing", driver: "Loyalty", evidence: ev, missingEvidence: ["Cohort data"], confidence: 0.72, businessImpact: "high" },
    { statement: "Competitor price cuts drive switching", driver: "Price", evidence: [], missingEvidence: ["Fare index"], confidence: 0.4, businessImpact: "medium" },
  ] };
  if (sys.includes("partially agreed")) return { revised: { statement: "Frequent flyers on short-haul routes are lapsing", driver: "Loyalty", evidence: ev, missingEvidence: [], confidence: 0.75, businessImpact: "high" }, clarifyingQuestions: ["Which routes?"] };
  if (sys.includes("Recommendation Agent")) {
    const ids = [...new Set(prompt.match(/hyp_[a-f0-9]{8}/g) ?? [])];
    return { recommendations: [{ title: "Predictive churn intervention", why: "Late detection", problemAddressed: "Lapsing flyers", hypothesisIds: [...ids, "hyp_bogus000"], targetCustomer: "High-value flyers", expectedImpact: "Recover repeat rate", requiredData: ["Bookings"], requiredTechnology: ["CDP"], activation: ["Score", "Offer"], measurement: ["Repeat rate"], cost: "medium", complexity: "medium", timeToValueWeeks: 8, dependencies: [], risks: ["Offer cost"], impactScore: 5, effortScore: 2, confidence: 0.8, strategicFit: 5, expectedLiftPct: 8, evidence: ev, assumptions: ["8% lift"] }] };
  }
  if (sys.includes("Activation Agent")) return { customerJourney: ["Search", "Booking", "Travel"].map((stage) => ({ stage, customerNeed: "n", customerBehavior: "b", painPoint: "p", businessObjective: "o", data: ["d"], trigger: "t", activation: "a", technology: ["CDP"], kpi: "k" })), journeys: [{ name: "Winback", objective: "Retain", audience: "At-risk", channels: ["Email"], controlGroup: "10%", steps: [{ id: "s1", type: "trigger", label: "Purchase" }, { id: "s2", type: "channel", label: "Email" }] }] };
  if (sys.includes("Measurement Agent")) return { northStar: "Repeat booking rate", kpis: ["business", "customer", "marketing"].map((level) => ({ name: `${level} kpi`, definition: "d", level, type: "lagging" })), attribution: "Holdout", incrementality: "Control groups", experiments: [{ hypothesis: "h", audience: "a", control: "c", treatment: "t", primaryKpi: "p", secondaryKpis: [], sampleSize: "s", duration: "6 weeks", expectedLift: "5% (assumption)", successCriteria: "sig" }] };
  if (sys.includes("Pilot, the case assistant")) return { answer: prompt.includes("weather") ? "I can only help with this case." : "The top driver is frequent flyers lapsing (Hypothesis 1).", citations: ["Hypothesis 1"], outOfScope: prompt.includes("weather"), followUps: ["What is the base-case ROI?"] };
  if (sys.includes("Report Agent")) return { executive: { whatIsHappening: "Frequent flyers are lapsing.", whyItIsHappening: ["Late detection"], whatWeShouldDo: ["Predictive churn"], whatItWillDeliver: "Modelled ₹160M", whatHappensNext: { days30: ["Baseline"], days60: ["Pilot"], days90: ["Scale"] } }, keyFindings: ["k"], customerInsights: ["c"], dataAssessment: "d", technologyAssessment: "t", roadmap: [{ horizon: "0-30 days", theme: "Quick wins", initiatives: ["i"] }], risks: [{ risk: "r", mitigation: "m" }], dependencies: ["d"], nextSteps: ["n"] };
  throw new Error(`Unexpected agent: ${sys.slice(0, 80)}`);
}

const fake: ProviderAdapter = {
  kind: "openai",
  async complete(req) {
    if (failNext) {
      failNext = false;
      const { AIProviderError } = await import("@/ai/types");
      throw new AIProviderError("down", "openai", 401, false);
    }
    return { text: JSON.stringify(fixture(req)), inputTokens: 100, outputTokens: 50, model: "fake" };
  },
};

vi.mock("./providers", async (orig) => {
  const actual = await orig<typeof import("./providers")>();
  const { recordUsage } = await import("./usage");
  return {
    ...actual,
    gatewayFor: async () =>
      new AIGateway({ providers: [{ id: "p", kind: "openai", label: "Fake", models: { fast: "f", reasoning: "r", large: "l" }, credentials: { apiKey: "k" } }], adapterFor: () => fake, recordUsage, backoffMs: 1 }),
  };
});

const svc = await import("./cases");
const chat = await import("./chat");
const { renderReport } = await import("@/reports/render");
const { DEFAULT_BRAND } = await import("@/domain/types");

/* --------------------------------- tests --------------------------------- */

const now = new Date().toISOString();
const profile = (orgId: string, role: UserProfile["role"] = "owner"): UserProfile => ({ id: `u-${orgId}`, organizationId: orgId, email: "a@b.c", displayName: "A", role, createdAt: now, updatedAt: now });
const authFor = (orgId: string): AuthContext => ({ uid: `u-${orgId}`, email: "a@b.c", name: "A", profile: profile(orgId), orgId });

describe("consulting lifecycle", () => {
  let store: MemoryStore;
  beforeEach(async () => {
    store = new MemoryStore(undefined, true);
    setStore(store);
    for (const org of ["org1", "org2"]) await store.collection<{ id: string; plan: string }>("organizations").set({ id: org, plan: "business" });
    prompts.length = 0;
  });

  it("runs problem → interview → diagnosis → validation gate → strategy → report", async () => {
    const auth = authFor("org1");
    const created = await svc.createCase(auth, {
      name: "Airline retention",
      problemStatement: "Our airline has seen a decline in repeat bookings over the last 12 months. Contact ops@airline.com.",
      currency: "INR",
    });
    expect(created.industryId).toBe("airline");
    expect(created.context.fields["business.industry"]!.kind).toBe("inference");
    expect(created.context.fields["business.geography"]!.source).toBe("ai_extraction");
    // Invalid extracted option is discarded rather than trusted.
    expect(created.context.fields["business.industry"]!.value).toBe("Airlines");
    // PII never reaches the provider.
    expect(prompts.join("\n")).not.toContain("ops@airline.com");

    // The Interview Planner tailors wording to the case and drops what does not apply.
    expect(created.questionPlan?.status).toBe("ready");
    expect(created.questionPlan?.metric).toBe("repeat bookings");
    const tailored = await svc.getInterview(auth, created.id);
    const all = (await import("@/engine/interview")).nextQuestions(created, 200);
    expect(all.find((q) => q.id === "perf-onset")?.prompt).toBe("When did repeat bookings start to slide, and was the drop sudden or gradual?");
    expect(all.some((q) => q.id === "biz-geo")).toBe(false);
    expect(all.find((q) => q.id === "cust-declining")?.prompt).toBe("Which passenger groups are declining the most?");
    // The inferred industry is offered for confirmation rather than asked cold.
    const industryQ = all.find((q) => q.id === "biz-industry");
    expect(industryQ?.suggested).toBe("Airlines");
    expect(tailored.interview.focus).toContain("passengers");

    // Shared data is stored as a masked profile: personal data never persists.
    const shared = await svc.addDataset(auth, created.id, svc.DatasetInputSchema.parse({
      name: "Bookings by route",
      kind: "table",
      content: "email,route,month,bookings\nnaman@example.com,DEL-BOM,2026-01,4\npriya@example.com,DEL-BLR,2026-02,2",
    }));
    const ds = shared.case.datasets![0]!;
    expect(ds.rowCount).toBe(2);
    expect(ds.maskedColumns).toContain("email");
    expect(JSON.stringify(ds)).not.toContain("example.com");
    expect(ds.columns!.find((c) => c.name === "bookings")).toMatchObject({ type: "number", sum: 6 });

    // Diagnosis is gated on discovery readiness.
    await expect(svc.diagnose(auth, created.id, false)).rejects.toMatchObject({ code: "NOT_READY" });

    // Answer every critical question via the structured interview.
    let state = await svc.getInterview(auth, created.id);
    for (let i = 0; i < 40 && !state.interview.readiness.ready; i++) {
      const q = state.interview.questions[0]!;
      const value = q.input === "multiselect" ? [q.options![0]!] : q.input === "select" ? q.options![0]! : ["number", "percent", "currency"].includes(q.input) ? 10 : "Answer";
      state = await svc.answerQuestions(auth, created.id, { answers: [{ questionId: q.id, value }] });
    }
    expect(state.interview.readiness.ready).toBe(true);
    expect(state.case.status).toBe("discovery");

    // Validation errors are surfaced, not stored.
    await expect(svc.answerQuestions(auth, created.id, { answers: [{ questionId: "eco-margin", value: 150 }] })).rejects.toMatchObject({ status: 400 });

    // Adaptive interview questions from the Interview Agent.
    const deeper = await svc.deepenInterview(auth, created.id);
    expect(deeper.case.adaptiveQuestions.map((q) => q.key)).toContain("performance.ai_route_mix");

    await svc.diagnose(auth, created.id, false);
    // The activity log shows what was analysed and the model's reasoning summary; the summary is not stored on the case.
    const { getActivity } = await import("./activity");
    const act = await getActivity("org1", created.id);
    expect(act!.steps.some((s) => s.kind === "thinking" && s.label.includes("Ruled out seasonality"))).toBe(true);
    expect(act!.steps.some((s) => s.kind === "analysis" && s.label === "Using data you shared")).toBe(true);
    expect(act!.history?.length).toBeGreaterThan(0);
    expect(JSON.stringify((await svc.getCase(auth, created.id)).case.diagnosis)).not.toContain("thinking_summary");
    let view = await svc.generateHypotheses(auth, created.id);
    expect(view.case.status).toBe("validation");
    // Every hypothesis is evidence-checked and stress-tested by the debate panel.
    expect(view.case.debateStatus).toBe("done");
    const debated = view.case.hypotheses[0]!;
    expect(debated.debate?.challenges.map((ch) => ch.panelistId)).toEqual(["statistician"]);
    expect(debated.debate?.verdict.outcome).toBe("survives");
    expect(debated.assessment?.basis).toContain("Debate verdict: survives");
    expect(view.case.hypotheses[1]!.assessment!.score).toBeLessThan(debated.assessment!.score);
    const [h1, h2] = view.case.hypotheses;

    // The approval gate blocks the strategy until every hypothesis is reviewed.
    await expect(svc.generateRecommendations(auth, created.id)).rejects.toMatchObject({ code: "GATE_CLOSED" });
    await expect(svc.reviewHypothesis(auth, created.id, h2!.id, { action: "disagree" })).rejects.toMatchObject({ status: 400 });
    await svc.reviewHypothesis(auth, created.id, h2!.id, { action: "disagree", feedback: "Our fares did not change" });
    view = await svc.reviewHypothesis(auth, created.id, h1!.id, { action: "partially_agree", feedback: "Mostly short-haul" });
    const refined = view.case.hypotheses.find((h) => h.id === h1!.id)!;
    expect(refined.statement).toMatch(/short-haul/);
    expect(view.case.adaptiveQuestions.some((q) => q.prompt === "Which routes?")).toBe(true);

    view = await svc.generateRecommendations(auth, created.id);
    const rec = view.case.recommendations[0]!;
    expect(rec.priority).toBe("P0");
    expect(rec.priorityScore).toBe(10);
    // Hallucinated / rejected hypothesis links are dropped.
    expect(rec.hypothesisIds).toEqual([h1!.id]);
    // The rejected hypothesis was passed to the agent as rejected, with the user's reason.
    expect(prompts.at(-1)).toContain("Our fares did not change");

    view = await svc.generatePlan(auth, created.id);
    expect(view.case.journeys).toHaveLength(1);
    expect(view.case.measurement?.northStar).toBe("Repeat booking rate");

    const defaults = svc.economicsDefaults(view.case);
    expect(defaults.inputs.scenarioLifts.base).toBe(8);
    // A retention problem gets the retention template; switching re-labels the same maths.
    expect(defaults.inputs.model).toBe("retention");
    expect(svc.economicsDefaults(view.case, "conversion").inputs.model).toBe("conversion");
    view = await svc.saveEconomics(auth, created.id, { ...defaults.inputs, eligibleCustomers: 500_000, averageAnnualValue: 4000, grossMarginPct: 30 });
    expect(view.case.economics!.inputProvenance.eligibleCustomers).toBe("assumption");
    expect(view.case.economics!.scenarios.find((s) => s.name === "base")!.incrementalRevenue).toBe(160_000_000);

    await expect(chat.askCase(auth, created.id, "What is happening?")).rejects.toMatchObject({ code: "CHAT_LOCKED" });
    view = await svc.generateReport(auth, created.id);
    const conv = await chat.askCase(auth, created.id, "What is the main driver?");
    expect(conv.messages.at(-1)).toMatchObject({ role: "assistant", citations: ["Hypothesis 1"], outOfScope: false });
    const off = await chat.askCase(auth, created.id, "What's the weather in Paris?");
    expect(off.messages.at(-1)!.outOfScope).toBe(true);
    expect((await chat.getChat(auth, created.id)).messages).toHaveLength(4);
    await expect(chat.getChat(authFor("org2"), created.id)).rejects.toMatchObject({ status: 404 });
    expect(view.case.status).toBe("completed");
    expect(view.case.progress).toBe(100);

    for (const format of ["pdf", "docx", "pptx", "md", "json"] as const) {
      const out = await renderReport(view.case, DEFAULT_BRAND, format);
      expect(out.body.length).toBeGreaterThan(500);
    }
    const md = (await renderReport(view.case, DEFAULT_BRAND, "md")).body as string;
    expect(md).toContain("## Executive Summary");
    expect(md).toContain("Modelled estimate");

    const history = await svc.listHistory(auth, created.id);
    expect(history.versions.length).toBe(3);
    expect(history.decisions.some((d) => d.decision === "Disagreed hypothesis")).toBe(true);
    const diff = await svc.compareVersions(auth, created.id, history.versions.at(-1)!.id, history.versions[0]!.id);
    expect(diff.recommendations.added).toContain("Predictive churn intervention");
  }, 20_000);

  it("records every hypothesis review action without invalid values", async () => {
    const auth = authFor("org1");
    const c = await svc.createCase(auth, { name: "Review actions", problemStatement: "Customer retention has declined by 12% this year.", currency: "USD" });
    await svc.diagnose(auth, c.id, true);
    const v = await svc.generateHypotheses(auth, c.id);
    const [h1, h2] = v.case.hypotheses;
    let r = await svc.reviewHypothesis(auth, c.id, h1!.id, { action: "agree" });
    expect(r.case.hypotheses.find((h) => h.id === h1!.id)!.status).toBe("agreed");
    expect(r.case.hypotheses.find((h) => h.id === h1!.id)!.reviewedAt).toBeTruthy();
    r = await svc.reviewHypothesis(auth, c.id, h2!.id, { action: "edit", statement: "Edited without any feedback text at all" });
    expect(r.case.hypotheses.find((h) => h.id === h2!.id)).toMatchObject({ status: "agreed", editedByUser: true });
    r = await svc.reviewHypothesis(auth, c.id, h1!.id, { action: "disagree", feedback: "Changed my mind" });
    expect(r.case.hypotheses.find((h) => h.id === h1!.id)!.status).toBe("disagreed");
  });

  it("isolates tenants", async () => {
    const c = await svc.createCase(authFor("org1"), { name: "Private case", problemStatement: "Conversion dropped after a website redesign last month.", currency: "USD" });
    const other = authFor("org2");
    await expect(svc.getCase(other, c.id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.answerQuestions(other, c.id, { answers: [{ questionId: "biz-industry", value: "SaaS" }] })).rejects.toMatchObject({ status: 404 });
    await expect(svc.deleteCase(other, c.id)).rejects.toMatchObject({ status: 404 });
    expect(await svc.listCases(other)).toHaveLength(0);
  });

  it("saves the case and flags a resumable operation when AI is unavailable", async () => {
    const auth = authFor("org1");
    const c = await svc.createCase(auth, { name: "Resilience", problemStatement: "Customer retention has declined by 12% this year.", currency: "USD" });
    failNext = true;
    await expect(svc.diagnose(auth, c.id, true)).rejects.toThrow(/temporarily unavailable/);
    const after = await svc.getCase(auth, c.id);
    expect(after.case.pendingOperation?.operation).toBe("diagnose");
    await svc.diagnose(auth, c.id, true);
    expect((await svc.getCase(auth, c.id)).case.pendingOperation).toBeUndefined();
  });
});
