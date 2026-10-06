import type { ProblemType } from "@/domain/types";

const KEYWORDS: Record<ProblemType, string[]> = {
  retention: ["retention", "retain", "repeat", "churn", "returning", "lapse", "renewal", "attrition", "come back"],
  acquisition: ["acquisition", "acquire", "new customers", "cac", "lead", "traffic", "top of funnel", "customer growth"],
  conversion: ["conversion", "convert", "checkout", "abandon", "funnel", "redesign", "bounce", "booking rate", "quote-to"],
  activation: ["activation", "onboarding", "first value", "trial", "dormant account", "setup"],
  engagement: ["engagement", "engaged", "open rate", "usage", "inactive", "active users", "dau", "mau"],
  winback: ["winback", "win back", "win-back", "lapsed", "reactivat", "dormant"],
  loyalty: ["loyalty", "points", "tier", "membership", "rewards", "frequent flyer"],
  personalization: ["personalis", "personaliz", "relevance", "recommendation", "next best", "1:1"],
  crm: ["crm", "lifecycle", "email", "communication", "campaign", "whatsapp", "sms", "unsubscribe"],
  martech: ["cdp", "martech", "stack", "platform", "integration", "data warehouse", "tooling"],
  monetization: ["aov", "basket", "upsell", "cross-sell", "ancillary", "revenue per", "arpu", "ltv", "lifetime value"],
  brand: ["brand", "awareness", "perception", "share of voice"],
};

/** Lightweight deterministic problem classification (no AI needed). */
export function classifyProblem(text: string): ProblemType[] {
  const t = text.toLowerCase();
  const scored = (Object.keys(KEYWORDS) as ProblemType[])
    .map((type) => ({ type, hits: KEYWORDS[type].filter((k) => t.includes(k)).length }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 4).map((s) => s.type);
}
