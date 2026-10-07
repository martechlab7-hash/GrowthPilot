import type { ProblemType, Question } from "@/domain/types";
import { INDUSTRY_OPTIONS } from "./industries";
import { VENDOR_GROUPS, VENDOR_OPTIONS } from "./martech";

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
  /** Case-type wording: the first variant matching the case's problem types replaces prompt/why/placeholder. */
  variants?: { problemTypes: ProblemType[]; prompt: string; why?: string; placeholder?: string }[];
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
    when: { problemTypes: ["acquisition", "paid_media", "seo_content", "brand", "pricing", "pipeline", "conversion"] },
  }),
  q({
    id: "biz-atv", key: "business.avg_transaction_value", stage: "business", category: "ECONOMICS",
    prompt: "What is your average {purchase} value?",
    why: "Transaction value shapes how much we can invest per customer intervention.",
    input: "currency",
    businessImpact: 4, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["retention", "winback", "loyalty", "monetization", "pricing", "conversion", "acquisition", "paid_media", "crm", "engagement"] },
  }),
  q({
    id: "biz-frequency", key: "business.purchase_frequency", stage: "business", category: "CUSTOMER",
    prompt: "How often does a typical {customer} {purchaseVerb}?",
    why: "Natural purchase cycle defines when a customer should be considered at risk.",
    input: "select", options: ["Weekly or more", "Monthly", "Quarterly", "A few times a year", "Annually", "Less than annually"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    boostFor: ["retention", "winback", "loyalty"],
    when: { problemTypes: ["retention", "winback", "loyalty", "engagement", "crm", "monetization", "personalization"] },
  }),
  q({
    id: "biz-customers", key: "business.customer_base_size", stage: "business", category: "ECONOMICS",
    prompt: "Roughly how many active {customers} do you have?",
    why: "Customer base size is needed to size the opportunity and to plan statistically valid tests.",
    input: "number", unit: "customers",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 4,
    when: { problemTypes: ["retention", "winback", "loyalty", "crm", "engagement", "personalization", "activation", "monetization", "advocacy", "app_growth"] },
  }),

  /* ----------------------------- PERFORMANCE ----------------------------- */
  q({
    id: "perf-definition", key: "performance.kpi_definition", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "How exactly do you define and measure {metric}?",
    why: "A definitional change or ambiguity can create an apparent decline; I need the precise definition before diagnosing.",
    input: "text", placeholder: "e.g. % of customers who bought in the last 12 months who bought again in the next 12 months",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4, critical: true,
  }),
  q({
    id: "perf-baseline", key: "performance.metric_baseline", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What was {metric} a year ago (or before the change)?",
    why: "The baseline quantifies the size of the problem and the value of fixing it.",
    input: "text", placeholder: "e.g. 42%",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "perf-current", key: "performance.metric_current", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What is {metric} today?",
    why: "Combined with the baseline this tells us the magnitude and direction of change.",
    input: "text", placeholder: "e.g. 37%",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "perf-onset", key: "performance.decline_onset", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "When did {metric} start to change, and was it sudden or gradual?",
    why: "A sudden change points to an event (pricing, release, competitor); a gradual one points to structural drivers.",
    input: "select", options: ["Sudden (within weeks)", "Gradual over months", "Seasonal pattern", "Not sure"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4, critical: true,
  }),
  q({
    id: "perf-uniform", key: "performance.decline_distribution", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Is the change in {metric} uniform across {customers}, or concentrated in specific segments?",
    why: "Concentration tells us whether the cause is customer-specific or systemic.",
    input: "select", options: ["Uniform across customers", "Concentrated in specific segments", "Concentrated in specific channels/markets", "Not sure"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "perf-cohort", key: "performance.affected_cohort", stage: "diagnosis", category: "CUSTOMER",
    prompt: "Is the decline among new {customers}, existing {customers}, or both?",
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
    prompt: "What changed around the time {metric} started to move (pricing, product, website, campaigns, competitors, operations)?",
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
    prompt: "Which {customer} segments do you have, and which are most valuable?",
    why: "Value concentration determines where interventions earn the highest return.",
    input: "longtext", placeholder: "e.g. Frequent business travellers (40% of revenue), leisure families…",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 5,
    when: { problemTypes: ["retention", "winback", "loyalty", "crm", "engagement", "personalization", "monetization", "pricing", "acquisition", "brand"] },
  }),
  q({
    id: "cust-declining", key: "customer.declining_segments", stage: "customer", category: "CUSTOMER",
    prompt: "Which {customer} groups are declining the most?",
    why: "Knowing who is declining focuses the diagnosis on the behaviour that actually changed.",
    input: "multiselect", options: ["High-value customers", "Mid-value customers", "Low-value customers", "New customers", "Tenured customers", "Loyalty members", "Non-members", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
    when: { problemTypes: ["retention", "winback", "loyalty", "engagement", "crm", "monetization", "activation", "app_growth"] },
  }),
  q({
    id: "cust-behaviour", key: "customer.behavior_changes", stage: "customer", category: "CUSTOMER",
    prompt: "Which {customer} behaviours have changed?",
    why: "Behavioural symptoms (frequency, basket, engagement, complaints) point to different root causes.",
    input: "multiselect", options: ["Lower purchase frequency", "Smaller basket / order value", "Shift to other channels", "Lower email/app engagement", "More complaints / service contacts", "Switching to competitors", "Longer gaps between purchases", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { problemTypes: ["retention", "winback", "loyalty", "engagement", "crm", "monetization", "personalization", "app_growth", "activation"] },
  }),
  q({
    id: "cust-segmentation", key: "customer.segmentation_approach", stage: "customer", category: "CUSTOMER",
    prompt: "How do you segment customers today?",
    why: "Segmentation maturity shows whether we can target the at-risk customers precisely.",
    input: "select", options: ["No formal segmentation", "Demographic", "Value-based / RFM", "Behavioural / lifecycle", "Predictive (propensity models)"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["crm", "personalization", "martech", "loyalty", "retention", "engagement"] },
  }),
  q({
    id: "cust-voc", key: "customer.voice_of_customer", stage: "customer", category: "EXPERIENCE",
    prompt: "What do {customers} say? Do you have NPS/CSAT, reviews or survey feedback?",
    why: "Customer feedback distinguishes experience-driven churn from price or relevance-driven churn.",
    input: "select", options: ["NPS/CSAT declining", "NPS/CSAT stable", "NPS/CSAT improving", "We collect feedback but don't analyse it", "No feedback data"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
    when: { problemTypes: ["retention", "winback", "loyalty", "advocacy", "brand", "conversion", "activation", "app_growth"] },
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
    when: { problemTypes: ["crm", "personalization", "martech", "measurement", "retention", "loyalty", "engagement", "winback"] },
  }),
  q({
    id: "data-latency", key: "data.latency", stage: "data", category: "DATA",
    prompt: "How fresh is customer data when marketing can use it?",
    why: "Data latency limits whether triggers can react in-moment or only in batch.",
    input: "select", options: ["Real-time", "Hourly", "Daily", "Weekly", "Monthly or slower"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["crm", "personalization", "martech", "engagement", "activation"] },
  }),
  q({
    id: "data-quality", key: "data.quality", stage: "data", category: "DATA",
    prompt: "How would you rate customer data quality and completeness?",
    why: "Poor data quality lowers confidence in any segment-level diagnosis and adds remediation work.",
    input: "select", options: ["Good", "Fair", "Poor", "Unknown"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 3,
    when: { problemTypes: ["crm", "martech", "measurement", "personalization"] },
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
    when: { problemTypes: ["crm", "personalization", "martech", "engagement", "retention", "winback", "loyalty", "activation"] },
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
    id: "mkt-links", key: "marketing.website_links", stage: "activation", category: "MARKETING",
    prompt: "Share links to the pages that matter for this problem.",
    why: "I read the pages myself (headline, calls to action, forms, offers, trust signals) instead of guessing what your customers see.",
    input: "links",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    boostFor: ["conversion", "paid_media", "seo_content"],
    when: { problemTypes: ["conversion", "acquisition", "paid_media", "seo_content", "app_growth", "activation", "brand", "pricing", "pipeline", "monetization"] },
    variants: [
      { problemTypes: ["conversion"], prompt: "Paste the links where {customers} drop off: landing page, product page, pricing or checkout.", why: "Conversion problems are usually visible on the page: unclear value, weak calls to action, long forms or missing trust signals. I'll read each page." },
      { problemTypes: ["paid_media", "acquisition"], prompt: "Paste the landing pages your ads and campaigns send traffic to.", why: "Paid traffic is only as good as the page it lands on. I'll check message match, calls to action and form friction." },
      { problemTypes: ["seo_content"], prompt: "Paste a few of the pages you want to rank: a key landing page, a category page and a typical article.", why: "I'll read titles, descriptions, headings and content depth for each page." },
      { problemTypes: ["app_growth", "activation"], prompt: "Paste your app store listing, sign-up page or onboarding help page.", why: "The first screens a new {customer} sees set activation. I'll read what they promise and ask for." },
      { problemTypes: ["pricing", "monetization"], prompt: "Paste your pricing or plans page and any upgrade page.", why: "I'll read how plans, anchors and upgrade prompts are presented." },
      { problemTypes: ["pipeline"], prompt: "Paste your demo or contact page and the main landing pages that generate leads.", why: "Lead quality and volume depend on what the page promises and how much the form asks for." },
      { problemTypes: ["brand"], prompt: "Paste your homepage and a page that best represents the brand.", why: "I'll read the positioning, proof points and tone as a customer would." },
    ],
  }),
  q({
    id: "mkt-screenshots", key: "marketing.comm_screenshots", stage: "activation", category: "MARKETING",
    prompt: "Upload screenshots of the messages {customers} receive today (email, SMS, WhatsApp, push or in-app).",
    why: "Seeing the actual message tells me more than a description: offer, call to action, personalisation, tone and clutter.",
    input: "images",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    boostFor: ["crm", "personalization", "winback"],
    when: { problemTypes: ["crm", "retention", "engagement", "winback", "loyalty", "personalization", "activation", "advocacy", "app_growth"], requiresKnown: ["marketing.channels"] },
    variants: [
      { problemTypes: ["winback"], prompt: "Upload screenshots of what a lapsed {customer} receives: your win-back or 'we miss you' messages.", why: "Win-back depends on the offer, the reason to return and the tone. I'll review each message." },
      { problemTypes: ["activation", "app_growth"], prompt: "Upload screenshots of the welcome and onboarding messages a new {customer} receives.", why: "Onboarding messages decide whether a sign-up reaches the first moment of value. I'll check each one's job and call to action." },
      { problemTypes: ["loyalty", "advocacy"], prompt: "Upload screenshots of your loyalty, rewards or referral messages.", why: "I'll check whether the reward is clear, the next milestone is visible and the call to action is easy." },
      { problemTypes: ["personalization", "crm"], prompt: "Upload screenshots of two or three typical campaign messages, ideally one batch and one triggered.", why: "I'll check how personalised they really are and whether the content matches the moment." },
    ],
  }),
  q({
    id: "mkt-cadence", key: "marketing.cadence", stage: "activation", category: "MARKETING",
    prompt: "Map your communication calendar: what goes out on each channel, how often and when.",
    why: "Cadence and timing explain fatigue, missed moments and channels competing with each other. I'll analyse the load per day and per channel.",
    input: "cadence",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    boostFor: ["crm", "engagement", "winback"],
    when: { problemTypes: ["crm", "retention", "engagement", "winback", "loyalty", "personalization", "activation", "app_growth"], requiresKnown: ["marketing.channels"] },
    variants: [
      { problemTypes: ["activation", "app_growth"], prompt: "What does a new {customer} receive in the first two weeks? Add each message with its channel, timing and trigger." },
      { problemTypes: ["winback"], prompt: "What does a {customer} receive once they start to lapse? Add each message with its channel, timing and trigger." },
      { problemTypes: ["engagement"], prompt: "What does an active {customer} receive in a typical week? Add each message with its channel, frequency and send time." },
      { problemTypes: ["retention", "loyalty"], prompt: "What does a typical {customer} receive between {purchase}s? Add each message with its channel, frequency and send time." },
    ],
  }),
  q({
    id: "mkt-personalisation", key: "marketing.personalization_level", stage: "activation", category: "MARKETING",
    prompt: "How personalised is communication today?",
    why: "Personalisation depth indicates how much relevance headroom exists.",
    input: "select", options: ["None – same message to all", "Basic (name, merge fields)", "Segment-level content", "1:1 / recommendation-driven"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["crm", "personalization", "engagement", "retention", "winback", "loyalty", "conversion", "martech", "activation"] },
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
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
    when: { problemTypes: ["martech", "crm", "personalization"] },
  }),
  q({
    id: "tech-vendors", key: "technology.vendors", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which marketing tools and platforms do you use today?",
    why: "Knowing your actual vendors (e.g. Adobe, Salesforce, Braze) lets me recommend extending what you already own before suggesting anything new, and shapes how activation can be implemented.",
    input: "multiselect",
    options: VENDOR_OPTIONS,
    groups: VENDOR_GROUPS.map((g) => ({ label: g.label, options: g.vendors.map((v) => v.name) })),
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "tech-tools", key: "technology.tools", stage: "technology", category: "TECHNOLOGY",
    prompt: "Any other tools not listed (in-house systems, regional vendors)?",
    why: "Tools outside the list still shape what can be activated quickly.",
    input: "text", placeholder: "e.g. in-house CDP, Netcore, regional SMS gateway",
    businessImpact: 2, diagnosticValue: 2, decisionRelevance: 3,
    when: { requiresKnown: ["technology.vendors"] },
  }),
  q({
    id: "tech-integration", key: "technology.integration", stage: "technology", category: "TECHNOLOGY",
    prompt: "How well are your systems integrated?",
    why: "Integration architecture determines time-to-value of data-driven activation.",
    input: "select", options: ["Siloed – manual exports", "Batch integrations", "API / near real-time", "Not sure"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["martech", "crm", "personalization", "measurement"] },
  }),
  q({
    id: "tech-models", key: "technology.ml_models", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which predictive models are used in marketing today?",
    why: "Predictive capability determines whether we can intervene before churn rather than after.",
    input: "multiselect", options: ["Churn propensity", "Purchase propensity", "Next best offer", "Customer lifetime value", "Product recommendations", "None"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["personalization", "crm", "martech", "retention", "winback", "loyalty"] },
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
    prompt: "What is the average annual revenue per {customer}?",
    why: "This is the value multiplier in the business case; without it any revenue estimate is an assumption.",
    input: "currency",
    businessImpact: 4, diagnosticValue: 2, decisionRelevance: 5,
    when: { problemTypes: ["retention", "winback", "loyalty", "monetization", "acquisition", "crm", "engagement", "paid_media"] },
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
    when: { problemTypes: ["crm", "martech", "personalization", "engagement", "retention", "winback", "loyalty"] },
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
    when: { problemTypes: ["acquisition", "conversion", "retention", "pricing", "brand", "paid_media", "seo_content", "winback", "pipeline"] },
  }),
  q({
    id: "exp-issues", key: "experience.issues", stage: "customer", category: "EXPERIENCE",
    prompt: "Are there known customer experience issues?",
    why: "Experience failures (service, delivery, digital) drive churn that communication cannot offset.",
    input: "multiselect", options: ["Service quality", "Delivery / fulfilment", "Digital UX / app issues", "Pricing perception", "Product quality", "Operational disruption", "None known"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
    when: { problemTypes: ["retention", "conversion", "activation", "advocacy", "winback", "app_growth", "loyalty"] },
  }),
  /* ------------------------- PROBLEM-SPECIFIC DEPTH ------------------------ */
  q({
    id: "price-changes", key: "performance.price_changes", stage: "diagnosis", category: "ECONOMICS",
    prompt: "Have prices, discounts or promotion depth changed recently (yours or competitors')?",
    why: "Price and promotion shifts are a leading cause of demand and margin changes; they separate pricing problems from marketing problems.",
    input: "select", options: ["We raised prices", "We cut prices / deepened discounts", "Competitors cut prices", "No material change", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { problemTypes: ["pricing", "retention", "conversion", "monetization", "acquisition"] },
  }),
  q({
    id: "price-discount-share", key: "economics.discounted_share", stage: "economics", category: "ECONOMICS",
    prompt: "Roughly what share of revenue is sold on promotion or discount?",
    why: "High promotional dependency erodes margin and trains customers to wait for deals.",
    input: "percent",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["pricing", "monetization", "loyalty"] },
  }),
  q({
    id: "b2b-funnel", key: "performance.b2b_funnel", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Where does the B2B funnel leak most?",
    why: "Lead volume, MQL→SQL conversion, win rate and cycle length each point to different fixes (targeting, qualification, sales enablement, pricing).",
    input: "select", options: ["Not enough leads", "Leads don't become MQLs", "MQL → SQL conversion", "Opportunities don't close (win rate)", "Sales cycle too long", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
    when: { problemTypes: ["pipeline"] },
  }),
  q({
    id: "b2b-deal", key: "business.b2b_deal_profile", stage: "business", category: "BUSINESS",
    prompt: "What are your typical deal size (ACV) and sales cycle length?",
    why: "Deal economics decide whether ABM, inside sales, product-led or partner motions make sense.",
    input: "text", placeholder: "e.g. $40k ACV, 4–6 month cycle",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["pipeline"] },
  }),
  q({
    id: "b2b-alignment", key: "operations.sales_marketing_alignment", stage: "business", category: "OPERATIONS",
    prompt: "Do sales and marketing share lead definitions, SLAs and a feedback loop?",
    why: "Misaligned definitions are a common hidden cause of 'bad leads'.",
    input: "select", options: ["Yes — shared definitions and SLAs", "Partially", "No", "Not sure"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["pipeline"] },
  }),
  q({
    id: "paid-trend", key: "performance.paid_media_trend", stage: "diagnosis", category: "MARKETING",
    prompt: "What changed in paid media performance?",
    why: "Rising CPMs, falling CTR (creative fatigue), falling CVR (landing/offer) or tracking loss each need a different response.",
    input: "multiselect", options: ["CPM / CPC rising", "CTR falling (creative fatigue)", "Conversion rate falling", "Tracking / signal loss (iOS, cookies)", "Budget shifted between channels", "Audience saturation", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { problemTypes: ["paid_media", "acquisition"] },
  }),
  q({
    id: "paid-split", key: "marketing.paid_channel_mix", stage: "activation", category: "MARKETING",
    prompt: "How is paid budget split across channels, and what is total monthly spend?",
    why: "Channel concentration and spend level shape where efficiency can be found and how to test incrementally.",
    input: "text", placeholder: "e.g. $120k/month — Meta 50%, Google 35%, TikTok 15%",
    businessImpact: 4, diagnosticValue: 3, decisionRelevance: 4,
    when: { problemTypes: ["paid_media", "acquisition", "measurement"] },
  }),
  q({
    id: "seo-trend", key: "performance.organic_trend", stage: "diagnosis", category: "MARKETING",
    prompt: "What happened to organic search traffic and rankings?",
    why: "Algorithm updates, technical issues, AI search answers or content decay cause different organic declines.",
    input: "select", options: ["Sudden drop after an algorithm update", "Gradual decline", "Drop after a site migration / redesign", "Traffic stable but conversions down", "Losing clicks to AI answers / SERP features", "Not sure"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { problemTypes: ["seo_content"] },
  }),
  q({
    id: "brand-tracking", key: "performance.brand_health", stage: "diagnosis", category: "COMPETITION",
    prompt: "How is brand health tracked (awareness, consideration, share of search)?",
    why: "Without brand metrics we can't tell whether demand is falling at the top of the funnel or being lost lower down.",
    input: "select", options: ["Regular brand tracker", "Share of search / social listening", "Occasional surveys", "Not tracked"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 3,
    when: { problemTypes: ["brand", "acquisition"] },
  }),
  q({
    id: "measure-confidence", key: "measurement.confidence", stage: "measurement", category: "PERFORMANCE",
    prompt: "How much do you trust your current marketing measurement?",
    why: "Low trust usually means decisions are made on last-click or platform-reported numbers, which over-credit some channels.",
    input: "select", options: ["High — validated with experiments/MMM", "Medium — directional only", "Low — numbers conflict", "We don't really measure"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["measurement", "paid_media", "acquisition"] },
  }),
  q({
    id: "advocacy-nps", key: "customer.advocacy", stage: "customer", category: "EXPERIENCE",
    prompt: "Do customers refer others today, and is there a referral or review programme?",
    why: "Referral and review loops are the cheapest acquisition channel when the experience supports them.",
    input: "select", options: ["Active referral programme", "Reviews programme only", "Organic word of mouth only", "None", "Not sure"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { problemTypes: ["advocacy", "acquisition", "loyalty"] },
  }),
  q({
    id: "app-funnel", key: "performance.app_funnel", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Where does the app funnel break down?",
    why: "Store conversion, onboarding, push opt-in and early retention need different fixes.",
    input: "multiselect", options: ["Store page conversion", "Install → sign-up", "Onboarding completion", "Push opt-in", "Day-7 / Day-30 retention", "Uninstalls", "Not sure"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { problemTypes: ["app_growth"] },
  }),
];

export function getBankQuestion(id: string): BankQuestion | undefined {
  return QUESTION_BANK.find((x) => x.id === id);
}