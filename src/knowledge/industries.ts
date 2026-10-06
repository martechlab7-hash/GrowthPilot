/**
 * Industry intelligence library. Content is qualitative by design: the platform
 * never ships numeric "benchmarks" it cannot source. Where a benchmark would
 * help, `benchmarkGuidance` tells the strategist what to compare against.
 */
export interface IndustryProfile {
  id: string;
  name: string;
  businessModels: string[];
  lifecycle: string[];
  kpis: string[];
  commonProblems: string[];
  drivers: string[];
  martechStack: string[];
  channels: string[];
  economicModel: string;
  frameworks: string[];
  benchmarkGuidance: string;
}

export const INDUSTRIES: IndustryProfile[] = [
  {
    id: "airline",
    name: "Airlines",
    businessModels: ["B2C", "B2B (corporate travel)", "Transaction"],
    lifecycle: ["Search", "Booking", "Pre-travel", "Travel", "Post-travel", "Repeat booking", "Loyalty", "Advocacy"],
    kpis: ["Repeat booking rate", "Load factor", "Yield / RASK", "Ancillary revenue per passenger", "Direct booking share", "Loyalty member share of revenue", "NPS"],
    commonProblems: ["Declining repeat bookings", "OTA dependency", "Low ancillary attach", "Loyalty programme disengagement", "Price-led switching"],
    drivers: ["Fare", "Schedule", "Route availability", "Loyalty benefits", "Service experience", "Ancillary products", "Competitor pricing", "Frequency", "Customer value", "Travel purpose"],
    martechStack: ["PSS / reservation system", "Loyalty platform", "CDP", "Marketing automation", "Revenue management", "Personalisation engine", "Customer service platform"],
    channels: ["Email", "Push", "In-app", "WhatsApp", "Website personalisation", "Paid search", "Metasearch", "Call centre"],
    economicModel: "Revenue = passengers × average fare + ancillaries; value concentrated in frequent and corporate travellers.",
    frameworks: ["cohort", "rfm", "lifecycle", "churn", "loyalty-tiering", "funnel"],
    benchmarkGuidance: "Compare repeat booking by route, travel purpose and loyalty tier against your own prior-year cohorts before external benchmarks.",
  },
  {
    id: "banking",
    name: "Banking",
    businessModels: ["B2C", "B2B", "Subscription-like (relationship)"],
    lifecycle: ["Awareness", "Application", "Onboarding", "Activation", "Product usage", "Cross-sell", "Primacy", "Advocacy"],
    kpis: ["Products per customer", "Primacy rate", "Activation rate", "Attrition rate", "Cost to acquire", "Deposit balances", "Digital adoption"],
    commonProblems: ["Low activation after account opening", "Dormant accounts", "Weak cross-sell", "Digital drop-off in applications"],
    drivers: ["Onboarding experience", "Rates and fees", "Digital experience", "Relevance of offers", "Service quality", "Trust"],
    martechStack: ["Core banking", "CRM", "CDP", "Marketing automation", "Decisioning / next-best-action", "Consent management", "Analytics"],
    channels: ["Mobile app", "Email", "SMS", "Push", "Branch", "Call centre", "Relationship managers"],
    economicModel: "Value = net interest margin + fee income across product holdings; lifetime value driven by primacy and tenure.",
    frameworks: ["funnel", "activation", "lifecycle", "churn", "next-best-action"],
    benchmarkGuidance: "Benchmark activation and attrition by product and acquisition channel; regulatory constraints apply to targeting.",
  },
  {
    id: "insurance",
    name: "Insurance",
    businessModels: ["B2C", "B2B2C (brokers/partners)", "Subscription (policy)"],
    lifecycle: ["Awareness", "Quote", "Purchase", "Onboarding", "Claims", "Renewal", "Cross-sell", "Advocacy"],
    kpis: ["Quote-to-bind rate", "Renewal / retention rate", "Lapse rate", "Claims satisfaction", "Policies per customer", "Combined ratio"],
    commonProblems: ["Renewal leakage", "Price-shopping at renewal", "Low engagement between renewals", "Quote abandonment"],
    drivers: ["Price at renewal", "Claims experience", "Engagement mid-term", "Channel (broker vs direct)", "Product fit"],
    martechStack: ["Policy admin system", "CRM", "Marketing automation", "CDP", "Pricing engine", "Analytics"],
    channels: ["Email", "SMS", "Agents / brokers", "Call centre", "Web", "App"],
    economicModel: "Value = premiums over tenure minus claims and servicing cost; retention economics dominate.",
    frameworks: ["churn", "lifecycle", "funnel", "cohort"],
    benchmarkGuidance: "Compare renewal rates by tenure, product and price change bucket.",
  },
  {
    id: "retail",
    name: "Retail",
    businessModels: ["B2C", "Omnichannel", "Transaction"],
    lifecycle: ["Awareness", "Consideration", "First purchase", "Second purchase", "Repeat", "Loyalty", "Advocacy"],
    kpis: ["Repeat purchase rate", "Purchase frequency", "Average order value", "Customer lifetime value", "Active customers", "Loyalty penetration"],
    commonProblems: ["Falling purchase frequency", "Low second-purchase conversion", "Discount dependency", "Store-to-digital identity gaps"],
    drivers: ["Assortment", "Price and promotion", "Convenience", "Store experience", "Personalisation", "Loyalty benefits"],
    martechStack: ["POS", "E-commerce platform", "CRM", "Loyalty platform", "CDP", "ESP", "Recommendation engine"],
    channels: ["Email", "SMS", "WhatsApp", "Push", "In-store", "Paid social", "Direct mail"],
    economicModel: "Value = active customers × frequency × AOV × margin.",
    frameworks: ["rfm", "cohort", "frequency", "lifecycle", "winback"],
    benchmarkGuidance: "Track 2nd-purchase rate and 90-day repeat by acquisition cohort and channel.",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    businessModels: ["B2C", "Marketplace", "D2C", "Subscription"],
    lifecycle: ["Awareness", "Visit", "Browse", "Cart", "Purchase", "Second purchase", "Repeat", "Loyalty", "Advocacy"],
    kpis: ["Conversion rate", "Cart abandonment", "Repeat purchase rate", "AOV", "CAC", "LTV:CAC", "Contribution margin per order"],
    commonProblems: ["Retention drop after first/second purchase", "Rising CAC", "Conversion decline", "Promo dependency"],
    drivers: ["Delivery experience", "Price competitiveness", "Assortment", "Site UX", "Personalisation", "Returns experience"],
    martechStack: ["Commerce platform", "ESP / marketing automation", "CDP", "Product analytics", "Recommendation engine", "Attribution"],
    channels: ["Email", "SMS", "WhatsApp", "Push", "Paid social", "Paid search", "Affiliates", "Onsite personalisation"],
    economicModel: "Value = orders × AOV × contribution margin; LTV:CAC governs growth efficiency.",
    frameworks: ["funnel", "cohort", "rfm", "churn", "attribution", "winback"],
    benchmarkGuidance: "Use your own cohort curves; compare M1/M3/M6 repeat rates by acquisition source.",
  },
  {
    id: "hospitality",
    name: "Hospitality",
    businessModels: ["B2C", "B2B (corporate/MICE)", "Transaction"],
    lifecycle: ["Inspiration", "Search", "Booking", "Pre-stay", "Stay", "Post-stay", "Rebooking", "Loyalty"],
    kpis: ["Direct booking share", "RevPAR", "Repeat guest rate", "Ancillary spend", "Review score", "Loyalty enrolment"],
    commonProblems: ["OTA dependency", "Low repeat stays", "Weak pre-stay upsell", "Guest data fragmentation"],
    drivers: ["Price parity", "Location", "Experience quality", "Loyalty value", "Reviews"],
    martechStack: ["PMS", "CRS", "CRM", "Loyalty", "Marketing automation", "Reputation management"],
    channels: ["Email", "WhatsApp", "Website", "Metasearch", "OTA", "Front desk"],
    economicModel: "Value = room nights × ADR + ancillaries − distribution cost.",
    frameworks: ["lifecycle", "cohort", "funnel", "loyalty-tiering"],
    benchmarkGuidance: "Compare direct vs OTA guests on repeat rate and net value after commission.",
  },
  {
    id: "telecom",
    name: "Telecom",
    businessModels: ["B2C", "B2B", "Subscription"],
    lifecycle: ["Acquisition", "Onboarding", "Usage", "Upgrade", "Renewal", "Retention", "Advocacy"],
    kpis: ["Churn rate", "ARPU", "Net adds", "Upsell rate", "NPS", "Cost to serve"],
    commonProblems: ["Contract-end churn", "Price-led switching", "Low data upsell", "Service-driven churn"],
    drivers: ["Network quality", "Price", "Device offers", "Service experience", "Bundles"],
    martechStack: ["BSS/OSS", "CRM", "Decisioning engine", "CDP", "Marketing automation", "Churn models"],
    channels: ["SMS", "App", "Push", "Call centre", "Retail stores", "Email"],
    economicModel: "Value = ARPU × tenure − cost to serve; small churn changes have large value impact.",
    frameworks: ["churn", "lifecycle", "next-best-action", "cohort"],
    benchmarkGuidance: "Analyse churn by contract stage, tenure and service incident exposure.",
  },
  {
    id: "saas",
    name: "SaaS",
    businessModels: ["B2B", "B2C", "Subscription", "Product-led", "Sales-led"],
    lifecycle: ["Awareness", "Trial / signup", "Activation", "Adoption", "Expansion", "Renewal", "Advocacy"],
    kpis: ["Activation rate", "Time to value", "Net revenue retention", "Gross churn", "Expansion revenue", "CAC payback", "Product qualified leads"],
    commonProblems: ["Low trial conversion", "Poor activation", "Logo churn", "Low expansion"],
    drivers: ["Onboarding", "Time to first value", "Feature adoption", "Customer success coverage", "Pricing / packaging"],
    martechStack: ["Product analytics", "CRM", "Marketing automation", "Customer success platform", "CDP", "Billing"],
    channels: ["In-app", "Email", "Customer success", "Sales", "Webinars", "Community"],
    economicModel: "Value = ARR × net revenue retention; CAC payback governs efficiency.",
    frameworks: ["activation", "funnel", "cohort", "churn", "engagement-decay"],
    benchmarkGuidance: "Define the activation event; compare cohorts by plan and acquisition source.",
  },
  {
    id: "other",
    name: "Other / General",
    businessModels: ["B2B", "B2C", "B2B2C", "Marketplace", "Subscription", "Transaction"],
    lifecycle: ["Awareness", "Consideration", "Purchase", "Onboarding", "Usage", "Repeat", "Loyalty", "Advocacy"],
    kpis: ["Revenue", "Active customers", "Retention rate", "Conversion rate", "CAC", "LTV"],
    commonProblems: ["Retention decline", "Acquisition efficiency", "Conversion decline"],
    drivers: ["Price", "Product", "Experience", "Relevance of communication", "Competition"],
    martechStack: ["CRM", "Marketing automation", "Analytics", "CDP"],
    channels: ["Email", "SMS", "Paid media", "Website", "Sales"],
    economicModel: "Value = customers × frequency × value × margin.",
    frameworks: ["funnel", "cohort", "lifecycle"],
    benchmarkGuidance: "Start with internal trend and cohort comparisons.",
  },
];

export const INDUSTRY_OPTIONS = INDUSTRIES.map((i) => i.name);

export function getIndustry(id: string | undefined): IndustryProfile | undefined {
  return INDUSTRIES.find((i) => i.id === id);
}

export function industryIdFromName(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  const exact = INDUSTRIES.find((i) => i.name.toLowerCase() === n || i.id === n);
  if (exact) return exact.id;
  const aliases: Record<string, string[]> = {
    airline: ["airline", "aviation", "air travel", "carrier", "flight"],
    banking: ["bank", "fintech", "lending", "credit card"],
    insurance: ["insur"],
    retail: ["retail", "grocery", "fashion", "store"],
    ecommerce: ["e-commerce", "ecommerce", "online store", "d2c", "dtc", "marketplace"],
    hospitality: ["hotel", "hospitality", "resort"],
    telecom: ["telecom", "telco", "mobile operator", "broadband"],
    saas: ["saas", "software", "subscription software"],
  };
  for (const [id, words] of Object.entries(aliases)) {
    if (words.some((w) => n.includes(w))) return id;
  }
  return undefined;
}
