import type { CaseContext, Maturity, MaturityDimension } from "@/domain/types";
import { capabilitiesFromVendors } from "@/knowledge/martech";
import { getList, getString, isKnown } from "./context";

export const MATURITY_LEVELS = [
  { level: 1, name: "Basic", description: "Batch marketing." },
  { level: 2, name: "Segmented", description: "Audience segmentation." },
  { level: 3, name: "Automated", description: "Lifecycle automation." },
  { level: 4, name: "Personalized", description: "Real-time personalization." },
  { level: 5, name: "Predictive", description: "AI/ML-driven marketing." },
  { level: 6, name: "Autonomous", description: "Agentic marketing optimization." },
] as const;

const MATURITY_KEYS = [
  "technology.stack", "technology.vendors", "technology.ml_models", "technology.integration", "data.available",
  "data.identity_resolution", "data.latency", "marketing.campaign_style",
  "marketing.personalization_level", "measurement.experimentation", "operations.team",
];

const has = (list: string[], item: string) => list.some((x) => x.toLowerCase() === item.toLowerCase());

/**
 * Deterministic MarTech maturity assessment (spec §21) derived only from what
 * the user told us. Unanswered inputs score 0 and are reported, never guessed.
 */
export function assessMaturity(ctx: CaseContext): Maturity {
  // Generic capabilities the user ticked plus those implied by named vendors.
  const vendors = getList(ctx, "technology.vendors");
  const stack = [...new Set([...getList(ctx, "technology.stack"), ...capabilitiesFromVendors(vendors)])];
  const models = getList(ctx, "technology.ml_models").filter((m) => m !== "None");
  const data = getList(ctx, "data.available");
  const identity = getString(ctx, "data.identity_resolution") ?? "";
  const latency = getString(ctx, "data.latency") ?? "";
  const style = getString(ctx, "marketing.campaign_style") ?? "";
  const personalization = getString(ctx, "marketing.personalization_level") ?? "";
  const experimentation = getString(ctx, "measurement.experimentation") ?? "";
  const team = getString(ctx, "operations.team") ?? "";
  const integration = getString(ctx, "technology.integration") ?? "";

  const dims: MaturityDimension[] = [];

  let dataScore = Math.min(3, data.length * 0.5);
  if (identity.startsWith("Yes")) dataScore += 1.5;
  else if (identity.startsWith("Partially")) dataScore += 0.75;
  if (latency === "Real-time" || latency === "Hourly") dataScore += 0.5;
  dims.push({ dimension: "Data", score: cap(dataScore), rationale: `${data.length} data sources; identity: ${identity || "unknown"}; latency: ${latency || "unknown"}` });

  let techScore = 0;
  for (const c of ["CRM", "CDP", "Marketing automation", "Data warehouse", "Personalisation engine"]) if (has(stack, c)) techScore += 0.8;
  if (integration.startsWith("API")) techScore += 1;
  else if (integration.startsWith("Batch")) techScore += 0.5;
  dims.push({
    dimension: "Technology",
    score: cap(techScore),
    rationale: `${vendors.length ? `Vendors: ${vendors.slice(0, 6).join(", ")}${vendors.length > 6 ? "…" : ""}. ` : ""}Capabilities: ${stack.join(", ") || "unknown"}; integration: ${integration || "unknown"}`,
  });

  const styleScore: Record<string, number> = {
    "Batch broadcasts to broad audiences": 1,
    "Segmented campaigns": 2,
    "Automated lifecycle triggers": 3.5,
    "Real-time personalised journeys": 5,
  };
  const persBonus: Record<string, number> = {
    "None – same message to all": 0,
    "Basic (name, merge fields)": 0.25,
    "Segment-level content": 0.5,
    "1:1 / recommendation-driven": 1,
  };
  dims.push({
    dimension: "Activation",
    score: cap((styleScore[style] ?? 0) + (persBonus[personalization] ?? 0)),
    rationale: `Campaigns: ${style || "unknown"}; personalisation: ${personalization || "unknown"}`,
  });

  let analytics = 0;
  if (has(stack, "Web / product analytics")) analytics += 1;
  if (has(stack, "BI dashboards")) analytics += 0.75;
  if (has(stack, "Attribution")) analytics += 0.75;
  const expScore: Record<string, number> = {
    Never: 0,
    "Occasionally / ad-hoc": 1,
    "Control groups on key campaigns": 2,
    "Always-on incrementality measurement": 2.5,
  };
  analytics += expScore[experimentation] ?? 0;
  dims.push({ dimension: "Analytics", score: cap(analytics), rationale: `Experimentation: ${experimentation || "unknown"}` });

  const ai = models.length * 1.25 + (has(stack, "ML / propensity models") ? 0.5 : 0);
  dims.push({ dimension: "AI", score: cap(ai), rationale: models.length ? `Models in use: ${models.join(", ")}` : "No predictive models reported" });

  const teamScore: Record<string, number> = {
    "No dedicated team": 1,
    "Agency-led": 2,
    "Small team (1–3)": 2,
    "Mid-size team (4–10)": 3.5,
    "Large team / CoE": 4.5,
  };
  dims.push({ dimension: "Operating Model", score: cap(teamScore[team] ?? 0), rationale: `Team: ${team || "unknown"}` });

  const avg = dims.reduce((s, d) => s + d.score, 0) / dims.length;
  const level = avg < 1.5 ? 1 : avg < 2.3 ? 2 : avg < 3 ? 3 : avg < 3.7 ? 4 : avg < 4.4 ? 5 : 6;
  const levelName = MATURITY_LEVELS[level - 1]!.name;

  const capabilityGaps = [
    gap("Customer data platform / identity", has(stack, "CDP") ? (identity.startsWith("Yes") ? "Unified" : "Present, identity incomplete") : "None", "Identity resolution & unified profile"),
    gap("CRM / lifecycle orchestration", has(stack, "Marketing automation") ? style : "No automation platform reported", "Trigger-based lifecycle orchestration"),
    gap("Analytics & incrementality", experimentation || "Unknown", "Control groups and incrementality measurement"),
    gap("Personalisation", personalization || "Unknown", "Context- and intent-aware personalisation"),
    gap("AI / predictive", models.length ? models.join(", ") : "None", "Propensity scoring (churn, purchase, CLV)"),
  ].filter((g) => g.gap !== "");

  return {
    level,
    levelName,
    dimensions: dims,
    capabilityGaps,
    basedOnFields: MATURITY_KEYS.filter((k) => isKnown(ctx, k)).length,
  };
}

function gap(capability: string, current: string, target: string) {
  const mature = /unified|real-time|always-on|1:1|churn|propensity/i.test(current);
  return {
    capability,
    current,
    gap: mature ? "" : target,
    recommendation: mature
      ? "Maintain"
      : "Close only if required by prioritised use cases; prefer extending existing tools.",
  };
}

function cap(n: number) {
  return Math.round(Math.min(5, Math.max(0, n)) * 10) / 10;
}
