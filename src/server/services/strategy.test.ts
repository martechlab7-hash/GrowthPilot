import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIGateway } from "@/ai/gateway";
import type { ChatRequest, ProviderAdapter } from "@/ai/types";
import type { UserProfile } from "@/domain/types";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import type { AuthContext } from "../auth";

const prompts: string[] = [];

function fixture(req: ChatRequest): unknown {
  const sys = req.system;
  const prompt = req.messages[0]!.content;
  prompts.push(prompt);
  if (sys.includes("Extract structured facts")) return { facts: [], problemTypes: [] };
  if (sys.includes("Interview Planner")) return { metric: "repeat orders", focus: "Growing repeat orders for a D2C shoe brand.", questions: [] };
  if (sys.includes("Diagnose the business before any strategy")) return {
    summary: "Repeat orders lag because there is no post-purchase programme.", strengths: ["Loyal first-time buyers"], weaknesses: ["No lifecycle journeys"], funnelGaps: ["Retention (observed)"],
    rootCauses: [{ statement: "No post-purchase journey", evidenceKind: "observed", confidence: 0.6, validateWith: "Cohort repeat rate by month" }],
    dataGaps: [{ item: "Repeat rate by cohort", why: "Sizes the gap", proposal: "Export orders by customer and month" }], contradictions: [], assumptions: ["Email consent is broadly available"],
  };
  if (sys.includes("Build the strategy from the DIAGNOSIS")) {
    const rec = (title: string, extra = {}) => ({
      pillarId: "p1", title, problem: "Repeat orders below target", evidence: "Stated repeat rate 18%", evidenceKind: "observed", rootCause: "No post-purchase journey",
      action: `Launch a three-step post-purchase email and WhatsApp journey for first-time buyers (${title})`, rationale: "Owned channels, existing tool", audience: "First-time buyers", channels: ["Email", "WhatsApp"],
      owner: "CRM lead", timeline: "Set-up 3w → QA 1w → launch → optimise", budget: "₹40k set-up, 2 days/week", kpi: "Repeat purchase rate", successCriteria: "+3 pts vs holdout in 90 days",
      dependencies: ["Order events in Klaviyo"], risks: ["Opt-outs"], fallback: "Test an SMS reminder instead", validateWith: "Holdout test",
      impact: 4, effort: 2, risk: 2, strategicFit: 5, confidence: 0.7, needsNewTech: false, whyPrioritized: "Cheapest lever with existing tools", ...extra,
    });
    return {
      executive: { situation: "Strong acquisition, weak repeat.", direction: "Build lifecycle retention first.", outcomes: "Higher repeat rate within two quarters (estimate)." },
      segments: [{ name: "First-time buyers", need: "Reason to come back", priority: "primary", evidenceKind: "observed" }],
      pillars: [{ id: "p1", title: "Lifecycle retention", objective: "Lift repeat rate", kpi: "Repeat purchase rate", rationale: "Biggest gap" }],
      recommendations: [rec("Post-purchase journey"), rec("TikTok creator push", { channels: ["TikTok"], impact: 3, effort: 4, risk: 4, strategicFit: 2, confidence: 0.4, needsNewTech: true, pillarId: "nope" })],
      channelPlan: [{ channel: "Email", status: "optimize", role: "Retention", funnelStage: "Post-purchase", rationale: "Live, under-used", kpi: "Repeat rate" }],
      messaging: { valueProposition: "Shoes that last", audienceValueProps: [], contentPillars: ["Care tips"], campaignConcepts: [] },
      lifecycle: [{ stage: "retention", journey: "Post-purchase", trigger: "Order delivered", channels: ["Email"], kpi: "Repeat rate" }],
      measurementReadiness: ["Set up a holdout group"], openQuestions: ["What is consented reach?"],
    };
  }
  if (sys.includes("devil's-advocate debate on each RECOMMENDATION")) {
    const ids = [...new Set(prompt.match(/rec_[a-f0-9]{8}/g) ?? [])];
    return { debates: ids.map((id) => ({ recommendationId: id, challenges: [{ panelistId: "finance", argument: "Payback is unproven." }, { panelistId: "nobody", argument: "x" }], defense: { argument: "Low cost, owned channel.", evidence: ["Stated repeat rate 18%"] }, verdict: { outcome: "survives", confidence: 0.7, reasoning: "Cheap to test.", settleWith: ["Holdout"] } })) };
  }
  if (sys.includes("Turn the RECOMMENDATIONS into an execution plan")) {
    const recId = prompt.match(/rec_[a-f0-9]{8}/)?.[0];
    const line = (item: string, category: string, monthly: number, oneTime = 0) => ({ item, category, monthly, oneTime });
    return {
      budget: [
        { pace: "conservative", summary: "Protect budget", lines: [line("Email tool", "technology", 20000), line("Creative", "creative", 30000)], scalingCriteria: [] },
        { pace: "balanced", summary: "Reallocate", lines: [line("Email tool", "technology", 20000, 40000), line("Meta retargeting", "media", 60000)], forecast: { metric: "Incremental repeat revenue / month", low: 100000, base: 200000, high: 300000, assumptions: ["+3 pts repeat rate"] }, scalingCriteria: ["Holdout lift ≥ 2 pts"] },
        { pace: "aggressive", summary: "Scale", lines: [line("Meta", "media", 150000)], scalingCriteria: ["Holdout lift ≥ 3 pts"] },
      ],
      tasks: [
        { id: "t1", workstream: "Data", title: "Holdout and tracking set-up", owner: "Analyst", weeks: 2, dependsOn: [], parallelizable: false, approval: false, launch: false, deliverable: "Holdout live" },
        { id: "t2", recommendationId: recId, workstream: "CRM", title: "Build journey", owner: "CRM lead", weeks: 3, dependsOn: ["t1", "ghost"], parallelizable: true, approval: true, launch: false, deliverable: "Journey built" },
        { id: "t3", recommendationId: "rec_unknown", workstream: "CRM", title: "Launch journey", owner: "CRM lead", weeks: 1, dependsOn: ["t2"], parallelizable: false, approval: false, launch: true, deliverable: "Live" },
      ],
      kpis: [
        { name: "Repeat purchase rate", level: "north_star", definition: "Share of buyers with a 2nd order in 90 days", baseline: "18%", target: "21%", cadence: "Monthly", source: "Shopify", evidenceKind: "observed" },
        { name: "Unsubscribe rate", level: "guardrail", definition: "Unsubscribes per send", cadence: "Weekly", source: "Klaviyo", evidenceKind: "unknown" },
      ],
      experiments: [{ name: "Journey holdout", hypothesis: "Journey lifts repeat", metric: "Repeat rate", design: "10% holdout", successThreshold: "+2 pts", duration: "8 weeks" }],
      risks: [{ risk: "Opt-outs rise", category: "compliance", likelihood: "medium", impact: "medium", mitigation: "Frequency cap" }],
      first30Days: ["Agree holdout design"],
    };
  }
  if (sys.includes("Research the named competitors")) return {
    findings: [{ competitor: "Rival", category: "Offers", finding: "Leads with 20% off first order", kind: "observed", source: "rival.example" }, { competitor: "Other", category: "Positioning", finding: "Premium", kind: "observed" }],
    comparisons: [{ dimension: "Offer", us: "No first-order offer", them: [{ competitor: "Rival", note: "20% off" }] }], implications: ["Test a first-order incentive"],
  };
  if (sys.includes("You are Pilot, the case assistant")) return { answer: "Start with the post-purchase journey.", citations: ["Recommendation: Post-purchase journey"], outOfScope: false, followUps: [] };
  throw new Error(`Unexpected agent: ${sys.slice(0, 80)}`);
}

const fake: ProviderAdapter = { kind: "openai", async complete(req) { return { text: JSON.stringify(fixture(req)), inputTokens: 10, outputTokens: 10, model: "fake" }; } };

vi.mock("./providers", async (orig) => {
  const actual = await orig<typeof import("./providers")>();
  return { ...actual, gatewayFor: async () => new AIGateway({ providers: [{ id: "p", kind: "openai", label: "Fake", models: { fast: "f", reasoning: "r", large: "l" }, credentials: { apiKey: "k" } }], adapterFor: () => fake, backoffMs: 1 }) };
});
vi.mock("../safeFetch", () => ({
  FetchBlockedError: class extends Error {},
  fetchPublicPage: async (url: string) => ({ url, html: "<title>Rival shoes</title><h1>Run more</h1><p>20% off your first order.</p><a>Shop now</a>" }),
}));

const svc = await import("./strategy");
const chat = await import("./chat");
const cases = await import("./cases");
const { nextQuestions, readiness } = await import("@/engine/interview");
const { renderReport } = await import("@/reports/render");
const { DEFAULT_BRAND } = await import("@/domain/types");

const now = new Date().toISOString();
const profile = (orgId: string): UserProfile => ({ id: `u-${orgId}`, organizationId: orgId, email: "a@b.c", displayName: "A", role: "owner", createdAt: now, updatedAt: now });
const auth: AuthContext = { uid: "u-org1", email: "a@b.c", name: "A", profile: profile("org1"), orgId: "org1" };
const settings = { type: "retention" as const, scope: "crm" as const, competitor: "compare" as const, channelPreference: "optimize_and_new" as const, pace: "balanced" as const, horizon: "90d" as const, resources: "limited" as const, competitors: [{ name: "Rival", url: "rival.example" }] };

describe("strategy builder", () => {
  beforeEach(async () => {
    const store = new MemoryStore(undefined, true);
    setStore(store);
    await store.collection<{ id: string; plan: string }>("organizations").set({ id: "org1", plan: "business" });
    prompts.length = 0;
  });

  it("runs interview → diagnosis → strategy + debate → review → plan → research → approval → branded report", async () => {
    const c = await svc.createStrategy(auth, { name: "Repeat orders", brief: "D2C shoe brand selling online. We want more customers to buy again.", currency: "INR", salesChannel: "online", settings });
    expect(c.kind).toBe("strategy");
    expect(c.context.fields["business.strategy_type"]?.value).toBe("Improve retention, loyalty or win-back");
    expect((await cases.listCases(auth)).length).toBe(0);
    expect((await cases.listCases(auth, undefined, "strategy")).map((x) => x.id)).toEqual([c.id]);

    // The strategy bank is used, branching on type, competitor research and answers.
    let qs = nextQuestions(c, 500).map((q) => q.id);
    expect(qs).toEqual(expect.arrayContaining(["s-offer", "s-icp", "s-budget", "s-comp-areas", "s-baseline", "s-volumes"]));
    expect(qs).not.toContain("s-launch-what");
    expect(qs).not.toContain("perf-onset");
    expect(qs).not.toContain("s-paid-spend");
    await cases.answerQuestions(auth, c.id, { answers: [{ questionId: "s-paid", value: "Yes, running ads" }, { questionId: "s-objective", value: "Revenue growth" }, { questionId: "s-budget", value: 100000 }] });
    let cur = (await cases.getCase(auth, c.id)).case;
    qs = nextQuestions(cur, 500).map((q) => q.id);
    expect(qs).toEqual(expect.arrayContaining(["s-paid-spend", "s-paid-results", "s-revenue-definition", "biz-atv"]));
    expect(readiness(cur).ready).toBe(false);

    // Diagnosis, then the strategy: priorities in code, unknown pillar fixed, debate in background.
    await expect(chat.askCase(auth, c.id, "Where do we start?")).rejects.toThrow(/strategy has been built/);
    await svc.diagnose(auth, c.id);
    const built = (await svc.build(auth, c.id)).case.strategy!;
    expect(built.status).toBe("generated");
    expect(built.recommendations.map((r) => r.title)).toEqual(["Post-purchase journey", "TikTok creator push"]);
    expect(built.recommendations[0]).toMatchObject({ rank: 1, quickWin: true, status: "proposed" });
    expect(built.recommendations[1]!.pillarId).toBe("p1");
    expect(built.recommendations.every((r) => r.debate?.verdict.outcome === "survives")).toBe(true);
    expect(built.recommendations[0]!.debate!.challenges.map((x) => x.panelistId)).toEqual(["finance"]);
    expect(built.debateStatus).toBe("done");

    // The assistant unlocks once the strategy is built and answers from the strategy itself.
    const answered = await chat.askCase(auth, c.id, "Where do we start?");
    expect(answered.messages.at(-1)!.content).toBe("Start with the post-purchase journey.");
    expect(prompts.at(-1)).toContain("Post-purchase journey");
    expect(prompts.at(-1)).toContain("strategySettings");

    // Review: rejecting needs a reason; approval feeds the plan.
    const [first, second] = built.recommendations;
    await expect(svc.reviewRecommendation(auth, c.id, second!.id, { action: "reject" })).rejects.toThrow(/why/);
    await svc.reviewRecommendation(auth, c.id, second!.id, { action: "reject", feedback: "TikTok is off-brand" });
    await svc.reviewRecommendation(auth, c.id, first!.id, { action: "approve" });
    await expect(svc.approve(auth, c.id)).rejects.toThrow(/roadmap/);

    const planned = (await svc.plan(auth, c.id)).case.strategy!;
    expect(prompts.at(-1)).toContain(first!.id);
    expect(prompts.at(-1)).not.toContain(second!.id);
    expect(planned.budget.map((b) => b.pace)).toEqual(["aggressive", "balanced", "conservative"]);
    expect(planned.tasks.find((t) => t.id === "t2")!.dependsOn).toEqual(["t1"]);
    expect(planned.tasks.find((t) => t.id === "t3")!.recommendationId).toBeUndefined();
    expect(planned.kpis.find((k) => k.level === "north_star")!.status).toBe("not_started");

    // Execution tracking.
    await svc.updateTask(auth, c.id, "t1", { status: "done" });
    const kpi = planned.kpis[0]!;
    await expect(svc.updateKpi(auth, c.id, kpi.id, { status: "off_track" })).rejects.toThrow(/corrective action/);
    await svc.updateKpi(auth, c.id, kpi.id, { actual: "17%", status: "off_track", correctiveAction: "Add an SMS reminder" });
    // Rebuilding the plan keeps recorded progress.
    const replanned = (await svc.plan(auth, c.id)).case.strategy!;
    expect(replanned.tasks.find((t) => t.title === "Holdout and tracking set-up")!.status).toBe("done");

    // Competitor research: pages read in code; comparisons kept because "compare" was chosen.
    const researched = (await svc.research(auth, c.id)).case.strategy!.research!;
    expect(researched.pagesRead[0]).toMatchObject({ competitor: "Rival", status: "read", title: "Rival shoes" });
    expect(researched.findings.find((f) => f.competitor === "Other")!.kind).toBe("hypothesis");
    expect(researched.comparisons).toHaveLength(1);

    // Approval saves a version.
    const approved = (await svc.approve(auth, c.id, "Signed off by CMO")).case;
    expect(approved.strategy!.status).toBe("approved");
    expect(approved.progress).toBe(100);
    const history = await cases.listHistory(auth, c.id);
    expect(history.versions.map((v) => v.label)).toEqual(expect.arrayContaining(["Strategy generated", `Approved strategy v${approved.strategy!.approval!.version}`]));

    cur = (await cases.getCase(auth, c.id)).case;
    const { body } = await renderReport(cur, { ...DEFAULT_BRAND, companyName: "Acme Shoes" }, "md");
    const md = String(body);
    for (const heading of ["Executive Summary", "Current-State Diagnosis", "Execution Readiness", "Prioritised Recommendations", "Budget Scenarios", "Timeline & Resource Plan", "KPI Tree", "Risk Register", "Competitor Intelligence", "First 30 Days"]) expect(md, heading).toContain(heading);
    expect(md).not.toContain("TikTok creator push");
    expect(md).toContain("Approved v");
    const pdf = await renderReport(cur, DEFAULT_BRAND, "pdf");
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);
});
