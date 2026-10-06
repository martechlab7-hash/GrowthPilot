import type { ProblemType, Question } from "@/domain/types";
import { INDUSTRY_OPTIONS } from "./industries";

/**
 * A bank question carries relevance rules in addition to the base scores.
 * The Information Value Engine scores relevant questions and asks the one
 * with the highest expected value next.
 */
export interface BankQuestion extends Question {
  /** Only relevant when the case matches. */
  when?: {
    problemTypes?: ProblemType[];
    industries?: string[];
    /** Ask only once these keys are known. */
    requiresKnown?: string[];
  };
  /** Multiplier applied when the case's problem types match. */
  boostFor?: ProblemType[];
}

const q = (b: Omit<BankQuestion, "critical" | "origin"> & { critical?: boolean }): BankQuestion => ({
  critical: false,
  origin: "bank",
  ...b,
});

export const QUESTION_BANK: BankQuestion[] = [
  /* ------------------------------ BUSINESS ------------------------------- */
  q({
    id: "biz-industry", key: "business.industry", stage: "business", category: "BUSINESS",
    prompt: "Which industry are you operating in?",
    why: "Industry determines the customer lifecycle, the KPIs that matter and the diagnostic frameworks I apply.",
    input: "select", options: INDUSTRY_OPTIONS,
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "biz-model", key: "business.business_model", stage: "business", category: "BUSINESS",
    prompt: "What is your business model?",
    why: "B2B and B2C retention and acquisition dynamics differ fundamentally; subscription vs transactional changes how churn is defined.",
    input: "multiselect", options: ["B2B", "B2C", "B2B2C", "Marketplace", "Subscription", "Transaction"],
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "biz-objective", key: "business.primary_objective", stage: "business", category: "BUSINESS",
    prompt: "Which business outcomes are you trying to achieve?",
    why: "The objective anchors the North Star metric and how recommendations are prioritised.",
    input: "multiselect",
    options: ["Increase revenue", "Increase retention", "Reduce churn", "Improve conversion", "Increase customer lifetime value", "Reduce CAC", "Increase engagement"],
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "biz-geo", key: "business.geography", stage: "business", category: "BUSINESS",
    prompt: "Which geographies or markets does this problem cover?",
    why: "Market context affects channel mix (e.g. WhatsApp adoption), regulation and competition.",
    input: "text", placeholder: "e.g. India, UAE",
    businessImpact: 3, diagnosticValue: 2, decisionRelevance: 3,
  }),
  q({
    id: "biz-atv", key: "business.avg_transaction_value", stage: "business", category: "ECONOMICS",
    prompt: "What is your average transaction / order value?",
    why: "Transaction value shapes how much we can invest per customer intervention.",
    input: "currency",
    businessImpact: 4, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "biz-frequency", key: "business.purchase_frequency", stage: "business", category: "CUSTOMER",
    prompt: "How often does a typical customer purchase or transact?",
    why: "Natural purchase cycle defines when a customer should be considered at risk.",
    input: "select", options: ["Weekly or more", "Monthly", "Quarterly", "A few times a year", "Annually", "Less than annually"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    boostFor: ["retention", "winback", "loyalty"],
  }),
  q({
    id: "biz-customers", key: "business.customer_base_size", stage: "business", category: "ECONOMICS",
    prompt: "Roughly how many active customers do you have?",
    why: "Customer base size is needed to size the opportunity and to plan statistically valid tests.",
    input: "number", unit: "customers",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 4,
  }),

  /* ----------------------------- PERFORMANCE ----------------------------- */
  q({
    id: "perf-definition", key: "performance.kpi_definition", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "How exactly is the affected metric defined (e.g. how do you define retention or conversion)?",
    why: "A definitional change or ambiguity can create an apparent decline; I need the precise definition before diagnosing.",
    input: "text", placeholder: "e.g. % of customers who bought in the last 12 months who bought again in the next 12 months",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4, critical: true,
  }),
  q({
    id: "perf-baseline", key: "performance.metric_baseline", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What was the metric a year ago (or before the change)?",
    why: "The baseline quantifies the size of the problem and the value of fixing it.",
    input: "text", placeholder: "e.g. 42%",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "perf-current", key: "performance.metric_current", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What is the metric today?",
    why: "Combined with the baseline this tells us the magnitude and direction of change.",
    input: "text", placeholder: "e.g. 37%",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "perf-onset", key: "performance.decline_onset", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "When did the change begin, and was it sudden or gradual?",
    why: "A sudden change points to an event (pricing, release, competitor); a gradual one points to structural drivers.",
    input: "select", options: ["Sudden (within weeks)", "Gradual over months", "Seasonal pattern", "Not sure"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4, critical: true,
  }),
  q({
    id: "perf-uniform", key: "performance.decline_distribution", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Is the change uniform across customers, or concentrated in specific segments?",
    why: "Concentration tells us whether the cause is customer-specific or systemic.",
    input: "select", options: ["Uniform across customers", "Concentrated in specific segments", "Concentrated in specific channels/markets", "Not sure"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "perf-cohort", key: "performance.affected_cohort", stage: "diagnosis", category: "CUSTOMER",
    prompt: "Is the decline among new customers, existing customers, or both?",
    why: "This separates acquisition-quality and onboarding problems from lifecycle and loyalty problems.",
    input: "select", options: ["New customers", "Existing / tenured customers", "Both", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
    when: { problemTypes: ["retention", "engagement", "loyalty", "winback", "activation"] },
  }),
  q({
    id: "perf-funnel-stage", key: "performance.funnel_stage", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "At which funnel stage is the largest drop?",
    why: "Locating the leaking stage narrows the root cause to traffic, experience or offer.",
    input: "select", options: ["Traffic / visits", "Product discovery / browse", "Add to cart / application start", "Checkout / application completion", "Payment", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
    when: { problemTypes: ["conversion", "acquisition"] },
  }),
  q({
    id: "perf-recent-changes", key: "performance.recent_changes", stage: "diagnosis", category: "OPERATIONS",
    prompt: "What changed around the time the decline started (pricing, product, website, campaigns, competitors, operations)?",
    why: "Coinciding internal or external events are the most common explanation for a sudden shift.",
    input: "longtext",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
  }),
  q({
    id: "perf-target", key: "performance.target", stage: "business", category: "PERFORMANCE",
    prompt: "What target would you consider success, and by when?",
    why: "A target lets me size the gap and stage the roadmap realistically.",
    input: "text", placeholder: "e.g. recover repeat rate to 42% within 12 months",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 4,
  }),

  /* ------------------------------- CUSTOMER ------------------------------ */
  q({
    id: "cust-segments", key: "customer.segments", stage: "customer", category: "CUSTOMER",
    prompt: "Which customer segments do you have, and which are most valuable?",
    why: "Value concentration determines where interventions earn the highest return.",
    input: "longtext", placeholder: "e.g. Frequent business travellers (40% of revenue), leisure families…",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "cust-declining", key: "customer.declining_segments", stage: "customer", category: "CUSTOMER",
    prompt: "Which customer groups are declining the most?",
    why: "Knowing who is declining focuses the diagnosis on the behaviour that actually changed.",
    input: "multiselect", options: ["High-value customers", "Mid-value customers", "Low-value customers", "New customers", "Tenured customers", "Loyalty members", "Non-members", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
  }),
  q({
    id: "cust-behaviour", key: "customer.behavior_changes", stage: "customer", category: "CUSTOMER",
    prompt: "What customer behaviours have changed?",
    why: "Behavioural symptoms (frequency, basket, engagement, complaints) point to different root causes.",
    input: "multiselect", options: ["Lower purchase frequency", "Smaller basket / order value", "Shift to other channels", "Lower email/app engagement", "More complaints / service contacts", "Switching to competitors", "Longer gaps between purchases", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
  }),
  q({
    id: "cust-segmentation", key: "customer.segmentation_approach", stage: "customer", category: "CUSTOMER",
    prompt: "How do you segment customers today?",
    why: "Segmentation maturity shows whether we can target the at-risk customers precisely.",
    input: "select", options: ["No formal segmentation", "Demographic", "Value-based / RFM", "Behavioural / lifecycle", "Predictive (propensity models)"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "cust-voc", key: "customer.voice_of_customer", stage: "customer", category: "EXPERIENCE",
    prompt: "What do customers say? Do you have NPS/CSAT, reviews or survey feedback?",
    why: "Customer feedback distinguishes experience-driven churn from price or relevance-driven churn.",
    input: "select", options: ["NPS/CSAT declining", "NPS/CSAT stable", "NPS/CSAT improving", "We collect feedback but don't analyse it", "No feedback data"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
  }),
  q({
    id: "cust-travel-purpose", key: "customer.travel_purpose_mix", stage: "customer", category: "CUSTOMER",
    prompt: "What is the mix of business vs leisure travellers, and has it shifted?",
    why: "Business and leisure travellers respond to different drivers (schedule vs fare); a mix shift can explain repeat-booking changes.",
    input: "text",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { industries: ["airline", "hospitality"] },
  }),
  q({
    id: "cust-second-purchase", key: "customer.second_purchase_rate", stage: "customer", category: "CUSTOMER",
    prompt: "What share of first-time buyers make a second purchase, and has it changed?",
    why: "The first-to-second purchase transition is where most retail/e-commerce retention is won or lost.",
    input: "text",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { industries: ["ecommerce", "retail"], problemTypes: ["retention", "loyalty", "winback"] },
  }),
  q({
    id: "cust-activation-event", key: "customer.activation_event", stage: "customer", category: "CUSTOMER",
    prompt: "What is your activation event (the moment a new customer first gets value)?",
    why: "Without a defined activation event we cannot measure onboarding effectiveness.",
    input: "text",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { industries: ["saas", "banking"] },
  }),

  /* --------------------------------- DATA -------------------------------- */
  q({
    id: "data-available", key: "data.available", stage: "data", category: "DATA",
    prompt: "Which customer data is available to you?",
    why: "Available data determines which analyses are feasible now and which conclusions remain assumptions.",
    input: "multiselect",
    options: ["Transaction data", "CRM / profile data", "Website behaviour", "App behaviour", "Campaign engagement", "Customer service interactions", "Loyalty data", "Survey / NPS data", "Product / catalogue data", "Consent & preferences"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "data-identity", key: "data.identity_resolution", stage: "data", category: "DATA",
    prompt: "Can you recognise the same customer across channels and touchpoints?",
    why: "Identity resolution determines whether we can trigger personalised, cross-channel interventions.",
    input: "select", options: ["No – data is siloed by channel", "Partially – some deterministic matching", "Yes – unified customer ID", "Not sure"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "data-latency", key: "data.latency", stage: "data", category: "DATA",
    prompt: "How fresh is customer data when marketing can use it?",
    why: "Data latency limits whether triggers can react in-moment or only in batch.",
    input: "select", options: ["Real-time", "Hourly", "Daily", "Weekly", "Monthly or slower"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "data-quality", key: "data.quality", stage: "data", category: "DATA",
    prompt: "How would you rate customer data quality and completeness?",
    why: "Poor data quality lowers confidence in any segment-level diagnosis and adds remediation work.",
    input: "select", options: ["Good", "Fair", "Poor", "Unknown"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 3,
  }),
  q({
    id: "data-consent", key: "data.contactability", stage: "data", category: "DATA",
    prompt: "Roughly what share of customers can you legally contact by email/SMS/WhatsApp/push?",
    why: "Contactable reach caps the impact of any CRM-led recommendation.",
    input: "text", placeholder: "e.g. Email 60%, WhatsApp 25%",
    businessImpact: 4, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["retention", "winback", "crm", "engagement", "loyalty", "personalization"] },
  }),

  /* ------------------------------ MARKETING ------------------------------ */
  q({
    id: "mkt-channels", key: "marketing.channels", stage: "activation", category: "MARKETING",
    prompt: "Which marketing channels do you actively use?",
    why: "Current channels define activation options and where communication may be missing or excessive.",
    input: "multiselect",
    options: ["Email", "SMS", "WhatsApp", "Push", "In-app", "RCS", "Web push", "Website personalisation", "Paid search", "Paid social", "Display", "Call centre", "Direct mail", "Sales team"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "mkt-style", key: "marketing.campaign_style", stage: "activation", category: "MARKETING",
    prompt: "How are campaigns mostly run today?",
    why: "Batch broadcast vs triggered lifecycle marketing is one of the strongest signals of retention capability.",
    input: "select", options: ["Batch broadcasts to broad audiences", "Segmented campaigns", "Automated lifecycle triggers", "Real-time personalised journeys"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5,
  }),
  q({
    id: "mkt-frequency", key: "marketing.contact_frequency", stage: "activation", category: "MARKETING",
    prompt: "How often does a typical customer receive marketing communication?",
    why: "Over-communication causes fatigue and opt-outs; under-communication leaves lifecycle moments uncovered.",
    input: "select", options: ["Several times a week", "About weekly", "A few times a month", "Monthly or less", "Varies / not tracked"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 3,
    when: { problemTypes: ["retention", "engagement", "crm", "winback", "loyalty"] },
  }),
  q({
    id: "mkt-personalisation", key: "marketing.personalization_level", stage: "activation", category: "MARKETING",
    prompt: "How personalised is communication today?",
    why: "Personalisation depth indicates how much relevance headroom exists.",
    input: "select", options: ["None – same message to all", "Basic (name, merge fields)", "Segment-level content", "1:1 / recommendation-driven"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "mkt-loyalty", key: "marketing.loyalty_program", stage: "activation", category: "MARKETING",
    prompt: "Do you run a loyalty programme?",
    why: "Loyalty mechanics influence repeat behaviour and provide data and levers for intervention.",
    input: "select", options: ["No", "Basic points programme", "Tiered programme", "Paid membership / subscription"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["retention", "loyalty", "winback", "engagement"] },
  }),
  q({
    id: "mkt-acq-mix", key: "marketing.acquisition_mix", stage: "activation", category: "MARKETING",
    prompt: "Has your acquisition channel mix or targeting changed recently?",
    why: "Shifts in acquisition sources often change the quality of new customers and later retention or conversion.",
    input: "longtext",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["acquisition", "conversion", "retention"] },
  }),

  /* ------------------------------ TECHNOLOGY ----------------------------- */
  q({
    id: "tech-stack", key: "technology.stack", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which capabilities exist in your marketing technology stack?",
    why: "I recommend technology only against capability gaps, so I need to know what already exists.",
    input: "multiselect",
    options: ["CRM", "CDP", "Marketing automation", "Email service provider", "Personalisation engine", "Web / product analytics", "Attribution", "Data warehouse", "Loyalty platform", "BI dashboards", "Consent management", "Customer service platform", "ML / propensity models"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "tech-tools", key: "technology.tools", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which specific tools/vendors do you use (optional)?",
    why: "Named tools let me recommend enhancements to what you own before suggesting new purchases.",
    input: "text", placeholder: "e.g. Salesforce, Braze, GA4, Snowflake",
    businessImpact: 2, diagnosticValue: 2, decisionRelevance: 3,
    when: { requiresKnown: ["technology.stack"] },
  }),
  q({
    id: "tech-integration", key: "technology.integration", stage: "technology", category: "TECHNOLOGY",
    prompt: "How well are your systems integrated?",
    why: "Integration architecture determines time-to-value of data-driven activation.",
    input: "select", options: ["Siloed – manual exports", "Batch integrations", "API / near real-time", "Not sure"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "tech-models", key: "technology.ml_models", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which predictive models are used in marketing today?",
    why: "Predictive capability determines whether we can intervene before churn rather than after.",
    input: "multiselect", options: ["Churn propensity", "Purchase propensity", "Next best offer", "Customer lifetime value", "Product recommendations", "None"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),

  /* ------------------------------ MEASUREMENT ---------------------------- */
  q({
    id: "meas-experimentation", key: "measurement.experimentation", stage: "measurement", category: "PERFORMANCE",
    prompt: "Do you use control groups or A/B tests to measure marketing impact?",
    why: "Without incrementality measurement we can't separate marketing effect from natural behaviour.",
    input: "select", options: ["Never", "Occasionally / ad-hoc", "Control groups on key campaigns", "Always-on incrementality measurement"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "meas-attribution", key: "measurement.attribution", stage: "measurement", category: "PERFORMANCE",
    prompt: "How do you attribute results to channels?",
    why: "Attribution approach affects which channels look effective and where budget flows.",
    input: "select", options: ["Last click", "First click", "Multi-touch", "Marketing mix modelling", "No attribution"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 3,
    when: { problemTypes: ["acquisition", "conversion"] },
  }),

  /* ------------------------------- ECONOMICS ----------------------------- */
  q({
    id: "eco-annual-value", key: "economics.avg_annual_value", stage: "economics", category: "ECONOMICS",
    prompt: "What is the average annual revenue per customer?",
    why: "This is the value multiplier in the business case; without it any revenue estimate is an assumption.",
    input: "currency",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 5,
  }),
  q({
    id: "eco-margin", key: "economics.gross_margin_pct", stage: "economics", category: "ECONOMICS",
    prompt: "What is your approximate gross margin?",
    why: "I separate revenue impact from profit impact; margin converts one to the other.",
    input: "percent",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 5,
  }),
  q({
    id: "eco-cac", key: "economics.cac", stage: "economics", category: "ECONOMICS",
    prompt: "What does it cost to acquire a new customer (CAC)?",
    why: "CAC shows whether retaining a customer is cheaper than replacing them — the core retention business case.",
    input: "currency",
    businessImpact: 3, diagnosticValue: 2, decisionRelevance: 4,
    when: { problemTypes: ["acquisition", "retention", "winback"] },
  }),
  q({
    id: "eco-budget", key: "economics.budget", stage: "economics", category: "ECONOMICS",
    prompt: "What budget range is realistic for this initiative?",
    why: "Budget constrains which recommendations are feasible in the near term.",
    input: "select", options: ["Minimal – use existing tools", "Moderate – optimise / add capabilities", "Significant – transformation programme", "Not yet defined"],
    businessImpact: 3, diagnosticValue: 1, decisionRelevance: 5,
  }),

  /* ------------------------ OPERATIONS & COMPETITION --------------------- */
  q({
    id: "ops-team", key: "operations.team", stage: "technology", category: "OPERATIONS",
    prompt: "What CRM / marketing operations capacity do you have?",
    why: "Execution capacity determines how much change can realistically be absorbed per quarter.",
    input: "select", options: ["No dedicated team", "Small team (1–3)", "Mid-size team (4–10)", "Large team / CoE", "Agency-led"],
    businessImpact: 3, diagnosticValue: 2, decisionRelevance: 4,
  }),
  q({
    id: "ops-constraints", key: "operations.constraints", stage: "business", category: "OPERATIONS",
    prompt: "Are there constraints I must respect (regulation, timelines, brand, IT freeze)?",
    why: "Constraints rule options out early, so recommendations stay actionable.",
    input: "longtext",
    businessImpact: 3, diagnosticValue: 2, decisionRelevance: 4,
  }),
  q({
    id: "comp-pressure", key: "competition.pressure", stage: "diagnosis", category: "COMPETITION",
    prompt: "Has competitive pressure changed (new entrants, price cuts, new offers)?",
    why: "Competitive moves are a common external driver that marketing alone may not fix.",
    input: "select", options: ["Significantly increased", "Somewhat increased", "No material change", "Not sure"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
  }),
  q({
    id: "exp-issues", key: "experience.issues", stage: "customer", category: "EXPERIENCE",
    prompt: "Are there known customer experience issues?",
    why: "Experience failures (service, delivery, digital) drive churn that communication cannot offset.",
    input: "multiselect", options: ["Service quality", "Delivery / fulfilment", "Digital UX / app issues", "Pricing perception", "Product quality", "Operational disruption", "None known"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
  }),
];

export function getBankQuestion(id: string): BankQuestion | undefined {
  return QUESTION_BANK.find((x) => x.id === id);
}
