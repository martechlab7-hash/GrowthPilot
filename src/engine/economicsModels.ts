import type { ProblemType } from "@/domain/types";

/**
 * Business-case templates. Every template uses the same auditable maths
 * (volume × lift × value per unit × margin − cost); what changes is what the
 * volume, value and lift MEAN for the problem being solved, how they are
 * labelled, sensible lift ranges, and which answers can pre-fill them.
 */
export interface EconomicsModel {
  id: string;
  name: string;
  description: string;
  volume: { label: string; hint: string; placeholder: string };
  value: { label: string; hint: string; placeholder: string };
  lift: { label: string; hint: string };
  /** Column header for volume × lift, e.g. "Customers retained". */
  impacted: string;
  lifts: { conservative: number; base: number; aggressive: number };
  /** Context keys that can pre-fill the inputs (first known wins). */
  volumeKeys: string[];
  valueKeys: string[];
  problemTypes: ProblemType[];
}

export const ECONOMICS_MODELS: EconomicsModel[] = [
  {
    id: "retention",
    name: "Retention / win-back",
    description: "Value of keeping (or winning back) customers who would otherwise lapse.",
    volume: { label: "Customers at risk or lapsed (per year)", hint: "Customers likely to stop buying in the next 12 months, or already lapsed and reachable.", placeholder: "e.g. 120,000" },
    value: { label: "Annual value per retained customer", hint: "Revenue a retained customer brings in a year.", placeholder: "e.g. 4,000" },
    lift: { label: "Share of them retained or won back", hint: "Percentage of at-risk customers the programme keeps, versus a control group." },
    impacted: "Customers retained",
    lifts: { conservative: 3, base: 6, aggressive: 10 },
    volumeKeys: ["customer.at_risk_count", "business.customer_base_size"],
    valueKeys: ["economics.avg_annual_value"],
    problemTypes: ["retention", "winback", "loyalty", "crm", "personalization"],
  },
  {
    id: "acquisition",
    name: "Acquisition",
    description: "Value of acquiring more new customers from the same or better spend.",
    volume: { label: "New customers acquired per year today", hint: "Current yearly new-customer volume across the channels in scope.", placeholder: "e.g. 50,000" },
    value: { label: "First-year value per new customer", hint: "Revenue a new customer brings in their first 12 months.", placeholder: "e.g. 2,500" },
    lift: { label: "Increase in new customers", hint: "Relative uplift in yearly new customers, e.g. 10 means 10% more." },
    impacted: "Extra new customers",
    lifts: { conservative: 5, base: 10, aggressive: 20 },
    volumeKeys: ["business.new_customers_per_year"],
    valueKeys: ["economics.avg_annual_value"],
    problemTypes: ["acquisition", "paid_media", "seo_content", "brand"],
  },
  {
    id: "conversion",
    name: "Conversion",
    description: "Value of converting more of the traffic or leads you already have.",
    volume: { label: "Conversions per year today", hint: "Orders, bookings, sign-ups or applications completed per year today.", placeholder: "e.g. 300,000" },
    value: { label: "Value per conversion", hint: "Average order or booking value (or value per sign-up).", placeholder: "e.g. 3,200" },
    lift: { label: "Relative conversion-rate improvement", hint: "e.g. 8 means the conversion rate rises by 8% of itself (2.5% → 2.7%)." },
    impacted: "Extra conversions",
    lifts: { conservative: 3, base: 8, aggressive: 15 },
    volumeKeys: ["business.conversions_per_year"],
    valueKeys: ["business.avg_transaction_value"],
    problemTypes: ["conversion"],
  },
  {
    id: "activation",
    name: "Activation & engagement",
    description: "Value of getting more new or dormant users to an active, paying state.",
    volume: { label: "New sign-ups or dormant users per year", hint: "Users who signed up or went dormant and could be activated.", placeholder: "e.g. 80,000" },
    value: { label: "Annual value of an activated user", hint: "Revenue (or margin-equivalent) an active user brings in a year.", placeholder: "e.g. 1,800" },
    lift: { label: "Extra users activated", hint: "Percentage of these users who become active because of the programme." },
    impacted: "Extra active users",
    lifts: { conservative: 2, base: 5, aggressive: 10 },
    volumeKeys: ["business.signups_per_year"],
    valueKeys: ["economics.avg_annual_value"],
    problemTypes: ["activation", "engagement", "app_growth"],
  },
  {
    id: "value",
    name: "Value per customer (pricing, upsell, frequency)",
    description: "Value of each existing customer spending more: price, mix, upsell or purchase frequency.",
    volume: { label: "Active customers in scope", hint: "Customers the pricing, upsell or frequency change applies to.", placeholder: "e.g. 200,000" },
    value: { label: "Annual value per customer today", hint: "Current yearly revenue per customer.", placeholder: "e.g. 5,000" },
    lift: { label: "Increase in value per customer", hint: "Relative increase in yearly revenue per customer." },
    impacted: "Customer-equivalents of new value",
    lifts: { conservative: 2, base: 4, aggressive: 8 },
    volumeKeys: ["business.customer_base_size"],
    valueKeys: ["economics.avg_annual_value"],
    problemTypes: ["pricing", "monetization"],
  },
  {
    id: "pipeline",
    name: "B2B pipeline",
    description: "Value of winning more deals from the pipeline.",
    volume: { label: "Deals won per year today", hint: "Closed-won deals per year in the segment in scope.", placeholder: "e.g. 400" },
    value: { label: "Average annual contract value", hint: "Average first-year value of a won deal (ACV).", placeholder: "e.g. 1,200,000" },
    lift: { label: "Increase in deals won", hint: "Relative uplift in yearly won deals from better targeting, scoring or ABM." },
    impacted: "Extra deals won",
    lifts: { conservative: 5, base: 10, aggressive: 20 },
    volumeKeys: ["business.deals_per_year"],
    valueKeys: ["business.acv"],
    problemTypes: ["pipeline"],
  },
  {
    id: "advocacy",
    name: "Referral & advocacy",
    description: "Value of new customers brought in by existing customers.",
    volume: { label: "Active customers who could refer", hint: "Satisfied, reachable customers in scope for a referral programme.", placeholder: "e.g. 150,000" },
    value: { label: "First-year value per referred customer", hint: "Revenue a referred customer brings in their first year.", placeholder: "e.g. 2,500" },
    lift: { label: "Referred new customers (as % of referrers)", hint: "Referred customers per 100 active customers in a year." },
    impacted: "Referred customers",
    lifts: { conservative: 1, base: 2, aggressive: 4 },
    volumeKeys: ["business.customer_base_size"],
    valueKeys: ["economics.avg_annual_value"],
    problemTypes: ["advocacy"],
  },
];

export const DEFAULT_ECONOMICS_MODEL = ECONOMICS_MODELS[0]!;

export function getEconomicsModel(id: string | undefined): EconomicsModel | undefined {
  return ECONOMICS_MODELS.find((m) => m.id === id);
}

/** The template that best fits the case's problem types. */
export function modelForProblem(problemTypes: ProblemType[]): EconomicsModel {
  for (const t of problemTypes) {
    const m = ECONOMICS_MODELS.find((x) => x.problemTypes.includes(t));
    if (m) return m;
  }
  return DEFAULT_ECONOMICS_MODEL;
}
