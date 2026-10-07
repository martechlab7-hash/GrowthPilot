import type { ProblemType } from "@/domain/types";

const KEYWORDS: Record<ProblemType, string[]> = {
  retention: ["retention", "retain", "repeat", "churn", "returning", "lapse", "renewal", "attrition", "come back", "repeat visit", "regulars"],
  acquisition: ["acquisition", "acquire", "new customers", "cac", "lead", "traffic", "top of funnel", "customer growth", "footfall", "walk-in", "walk in", "store visits", "new buyers"],
  conversion: ["conversion", "convert", "checkout", "abandon", "funnel", "redesign", "bounce", "booking rate", "quote-to"],
  activation: ["activation", "onboarding", "first value", "trial", "dormant account", "setup"],
  engagement: ["engagement", "engaged", "open rate", "usage", "inactive", "active users", "dau", "mau"],
  winback: ["winback", "win back", "win-back", "lapsed", "reactivat", "dormant"],
  loyalty: ["loyalty", "points", "tier", "membership", "rewards", "frequent flyer"],
  personalization: ["personalis", "personaliz", "relevance", "recommendation", "next best", "1:1"],
  crm: ["crm", "lifecycle", "email", "communication", "campaign", "whatsapp", "sms", "unsubscribe"],
  martech: ["cdp", "martech", "stack", "platform", "integration", "data warehouse", "tooling"],
  monetization: ["aov", "basket", "upsell", "cross-sell", "ancillary", "revenue per", "arpu", "ltv", "lifetime value", "bill value", "ticket size", "average bill", "order value", "spend per"],
  brand: ["brand", "awareness", "perception", "share of voice", "consideration", "positioning", "reputation"],
  pricing: ["pricing", "price", "discount", "promotion", "promo", "margin", "elasticity", "coupon"],
  pipeline: ["pipeline", "mql", "sql", "leads", "lead quality", "sales cycle", "b2b", "demo request", "abm", "account-based", "win rate", "opportunit"],
  paid_media: ["roas", "paid media", "paid social", "paid search", "ppc", "cpc", "cpm", "ad spend", "media spend", "performance marketing", "meta ads", "google ads", "creative fatigue"],
  seo_content: ["seo", "organic", "search ranking", "content", "blog", "traffic drop", "core update", "backlink"],
  measurement: ["attribution", "measurement", "mmm", "marketing mix", "incrementality", "tracking", "reporting", "dashboard", "kpi"],
  advocacy: ["referral", "advocacy", "word of mouth", "nps", "reviews", "ugc", "community", "ambassador"],
  app_growth: ["app install", "app store", "aso", "downloads", "uninstall", "push opt-in", "mobile app"],
};

/**
 * A plain revenue or sales problem ("grow revenue 5%", "sales fell") is
 * decomposed into its drivers: customers × frequency × basket × price.
 */
const REVENUE = /\b(revenue|sales|turnover|top ?line|topline|business|profit|income|gmv|volumes?)\b/;
const REVENUE_DRIVERS: ProblemType[] = ["acquisition", "retention", "monetization", "pricing"];

/** Lightweight deterministic problem classification (no AI needed). */
export function classifyProblem(text: string): ProblemType[] {
  const t = text.toLowerCase();
  const scored = (Object.keys(KEYWORDS) as ProblemType[])
    .map((type) => ({ type, hits: KEYWORDS[type].filter((k) => t.includes(k)).length }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (!scored.length && REVENUE.test(t)) return REVENUE_DRIVERS;
  return scored.slice(0, 4).map((s) => s.type);
}
