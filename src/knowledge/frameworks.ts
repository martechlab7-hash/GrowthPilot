import type { ProblemType } from "@/domain/types";

/** Reusable diagnostic framework library (spec §12). */
export interface DiagnosticFramework {
  id: string;
  name: string;
  category:
    | "Strategy"
    | "Acquisition"
    | "Activation"
    | "Retention"
    | "Winback"
    | "Loyalty"
    | "Personalization"
    | "CRM"
    | "MarTech"
    | "Measurement"
    | "Brand"
    | "Pricing"
    | "B2B"
    | "Paid media"
    | "SEO & content"
    | "Advocacy"
    | "App";
  description: string;
  problemTypes: ProblemType[];
  keywords: string[];
  requiredData: string[];
  answers: string;
  steps: string[];
}

export const FRAMEWORKS: DiagnosticFramework[] = [
  {
    id: "funnel",
    name: "Funnel Analysis",
    category: "Acquisition",
    description: "Locate where prospects or customers leak between stages.",
    problemTypes: ["acquisition", "conversion", "activation"],
    keywords: ["funnel", "drop", "conversion", "checkout", "signup", "redesign", "abandon"],
    requiredData: ["Stage-level volumes", "Web/app behaviour", "Channel source"],
    answers: "Which stage lost volume, for whom, and since when?",
    steps: ["Define stages", "Measure stage conversion over time", "Split by segment/channel/device", "Isolate the step with the largest change"],
  },
  {
    id: "cac",
    name: "CAC & Channel Efficiency",
    category: "Acquisition",
    description: "Assess acquisition cost and quality by channel.",
    problemTypes: ["acquisition"],
    keywords: ["cac", "cost per", "paid", "media", "acquisition cost", "lead"],
    requiredData: ["Spend by channel", "New customers by channel", "Early value by channel"],
    answers: "Which channels acquire valuable customers efficiently?",
    steps: ["Compute CAC by channel", "Compare cohort value by source", "Compute LTV:CAC", "Reallocate"],
  },
  {
    id: "attribution",
    name: "Channel Attribution",
    category: "Measurement",
    description: "Understand channel contribution beyond last click.",
    problemTypes: ["acquisition", "conversion"],
    keywords: ["attribution", "last click", "roas", "channel mix"],
    requiredData: ["Touchpoint logs", "Conversions", "Spend"],
    answers: "Which channels incrementally drive outcomes?",
    steps: ["Audit current model", "Compare models", "Validate with incrementality tests"],
  },
  {
    id: "activation",
    name: "First-Value / Onboarding Analysis",
    category: "Activation",
    description: "Measure time-to-value and onboarding completion.",
    problemTypes: ["activation", "engagement"],
    keywords: ["onboarding", "activation", "first value", "trial", "setup", "dormant account"],
    requiredData: ["Signup date", "Key product events", "Onboarding communications"],
    answers: "Do new customers reach first value, and how fast?",
    steps: ["Define activation event", "Measure time-to-value distribution", "Compare activated vs not on retention"],
  },
  {
    id: "cohort",
    name: "Cohort Analysis",
    category: "Retention",
    description: "Compare retention curves of customer cohorts over time.",
    problemTypes: ["retention", "engagement", "loyalty", "activation"],
    keywords: ["retention", "repeat", "cohort", "churn", "decline", "returning"],
    requiredData: ["Customer-level transaction history", "Acquisition date", "Acquisition source"],
    answers: "Is the decline in new or tenured cohorts, and at what lifecycle point?",
    steps: ["Build acquisition cohorts", "Plot retention curves", "Identify the period where curves diverge", "Split by segment"],
  },
  {
    id: "rfm",
    name: "RFM Segmentation",
    category: "Retention",
    description: "Segment by recency, frequency and monetary value.",
    problemTypes: ["retention", "winback", "loyalty", "personalization"],
    keywords: ["high value", "frequency", "recency", "segment", "vip", "value"],
    requiredData: ["Transaction history"],
    answers: "Which value segments are shrinking or migrating?",
    steps: ["Score R, F and M", "Build segments", "Track migration between periods"],
  },
  {
    id: "churn",
    name: "Churn Driver Analysis",
    category: "Retention",
    description: "Identify drivers and early signals of churn.",
    problemTypes: ["retention", "winback"],
    keywords: ["churn", "lapse", "cancel", "attrition", "renewal", "leaving"],
    requiredData: ["Churn label", "Behavioural signals", "Service interactions", "Pricing changes"],
    answers: "What predicts churn and how early can we see it?",
    steps: ["Define churn", "Profile churners vs retained", "Model propensity", "Define intervention window"],
  },
  {
    id: "lifecycle",
    name: "Customer Lifecycle Analysis",
    category: "CRM",
    description: "Map lifecycle stages, triggers and communication coverage.",
    problemTypes: ["retention", "crm", "engagement", "loyalty"],
    keywords: ["lifecycle", "journey", "crm", "trigger", "communication"],
    requiredData: ["Lifecycle stage definitions", "Campaign calendar", "Engagement data"],
    answers: "Which lifecycle moments are not covered by relevant communication?",
    steps: ["Define stages", "Map current communications", "Identify gaps and overlaps", "Prioritise triggers"],
  },
  {
    id: "engagement-decay",
    name: "Engagement Decay",
    category: "Retention",
    description: "Track how engagement deteriorates before churn.",
    problemTypes: ["engagement", "retention"],
    keywords: ["engagement", "open rate", "inactive", "usage drop"],
    requiredData: ["Engagement events over time"],
    answers: "When does engagement start to decay relative to churn?",
    steps: ["Build engagement index", "Plot decay curves", "Set decay thresholds"],
  },
  {
    id: "frequency",
    name: "Purchase Frequency Analysis",
    category: "Retention",
    description: "Analyse inter-purchase intervals and frequency shifts.",
    problemTypes: ["retention", "loyalty", "monetization"],
    keywords: ["frequency", "repeat", "inter-purchase", "basket"],
    requiredData: ["Transaction history"],
    answers: "Are customers buying less often, and which ones?",
    steps: ["Compute inter-purchase intervals", "Compare periods", "Split by value segment"],
  },
  {
    id: "winback",
    name: "Dormancy & Winback",
    category: "Winback",
    description: "Prioritise lapsed customers by previous value and intent.",
    problemTypes: ["winback", "retention"],
    keywords: ["winback", "win-back", "lapsed", "dormant", "reactivat"],
    requiredData: ["Last activity date", "Historic value", "Intent signals"],
    answers: "Which lapsed customers are worth winning back, and how?",
    steps: ["Define dormancy windows", "Score previous value and intent", "Design offers by segment", "Hold out control"],
  },
  {
    id: "loyalty-tiering",
    name: "Loyalty & Tiering Assessment",
    category: "Loyalty",
    description: "Evaluate loyalty programme design and engagement.",
    problemTypes: ["loyalty", "retention"],
    keywords: ["loyalty", "points", "tier", "rewards", "frequent flyer", "membership"],
    requiredData: ["Member activity", "Tier movement", "Redemption"],
    answers: "Does the programme change behaviour for valuable customers?",
    steps: ["Compare members vs non-members", "Analyse tier migration", "Assess benefit perception"],
  },
  {
    id: "next-best-action",
    name: "Personalisation / Next-Best-Action",
    category: "Personalization",
    description: "Assess segment, context, intent and propensity-driven decisioning.",
    problemTypes: ["personalization", "crm", "monetization"],
    keywords: ["personalis", "personaliz", "recommendation", "next best", "cross-sell", "upsell", "relevance"],
    requiredData: ["Profile", "Behaviour", "Product holdings", "Response history"],
    answers: "Are we making the right offer to the right customer at the right moment?",
    steps: ["Audit decisioning", "Define eligibility and propensity", "Arbitrate offers", "Test vs control"],
  },
  {
    id: "contactability",
    name: "CRM Contactability & Frequency",
    category: "CRM",
    description: "Evaluate reach, consent, suppression and fatigue.",
    problemTypes: ["crm", "engagement", "retention"],
    keywords: ["unsubscribe", "fatigue", "frequency", "consent", "deliverability", "contactable"],
    requiredData: ["Consent status", "Send logs", "Unsubscribes"],
    answers: "Can we reach customers, and are we over- or under-communicating?",
    steps: ["Measure contactable base", "Analyse frequency vs engagement", "Define caps and preference centre"],
  },
  {
    id: "martech-capability",
    name: "MarTech Capability Assessment",
    category: "MarTech",
    description: "Assess data, decisioning, activation and measurement capability.",
    problemTypes: ["martech", "personalization", "crm"],
    keywords: ["cdp", "crm", "martech", "stack", "platform", "integration", "tool"],
    requiredData: ["Current stack", "Integration architecture", "Use-case backlog"],
    answers: "Which capability gaps block the required use cases?",
    steps: ["List use cases", "Map required capabilities", "Score current maturity", "Identify gaps"],
  },
  {
    id: "experimentation",
    name: "Experimentation & Incrementality",
    category: "Measurement",
    description: "Establish control groups and incrementality measurement.",
    problemTypes: ["conversion", "crm", "personalization", "acquisition", "retention"],
    keywords: ["test", "a/b", "incremental", "control group", "experiment"],
    requiredData: ["Assignment logs", "Outcome data"],
    answers: "What is the true incremental effect of our marketing?",
    steps: ["Define hypothesis", "Size sample", "Randomise", "Measure lift"],
  },
  {
    id: "ux-diagnosis",
    name: "UX & Technical Performance Diagnosis",
    category: "Acquisition",
    description: "Check site/app experience and performance changes.",
    problemTypes: ["conversion"],
    keywords: ["redesign", "website", "page speed", "ux", "mobile", "checkout", "bug", "release"],
    requiredData: ["Web analytics", "Release log", "Performance metrics"],
    answers: "Did a product or technical change cause the drop?",
    steps: ["Align metric change with release timeline", "Compare device/browser", "Review session evidence"],
  },

  /* ------------------------------ Strategy ------------------------------ */
  {
    id: "aarrr", name: "AARRR Growth Funnel (Pirate Metrics)", category: "Strategy",
    description: "Locate the weakest stage across Acquisition, Activation, Retention, Referral and Revenue.",
    problemTypes: ["acquisition", "activation", "retention", "advocacy", "monetization", "app_growth"],
    keywords: ["growth", "funnel", "stalled", "plateau", "north star"],
    requiredData: ["Stage volumes and conversion by cohort", "Revenue per user"],
    answers: "Which growth stage constrains the business most right now?",
    steps: ["Define each stage's metric", "Measure stage conversion by cohort", "Size the value of a lift at each stage", "Focus on the binding constraint"],
  },
  {
    id: "jtbd", name: "Jobs-to-be-Done", category: "Strategy",
    description: "Understand the progress customers hire the product for, and what they fire it for.",
    problemTypes: ["retention", "conversion", "brand", "activation", "acquisition"],
    keywords: ["why customers", "needs", "switching", "churn reasons", "positioning", "value proposition"],
    requiredData: ["Customer interviews / surveys", "Switching reasons", "Usage contexts"],
    answers: "What job are customers hiring us for, and where do we fail it?",
    steps: ["Interview recent switchers in and out", "Map push/pull/anxiety/habit forces", "Define core jobs", "Align messaging and product to jobs"],
  },
  {
    id: "stp", name: "Segmentation, Targeting & Positioning (STP)", category: "Strategy",
    description: "Re-segment the market, pick target segments and sharpen positioning.",
    problemTypes: ["brand", "acquisition", "personalization", "pricing"],
    keywords: ["segment", "target", "positioning", "differentiat", "audience", "persona"],
    requiredData: ["Customer attributes and value", "Needs research", "Competitor positioning"],
    answers: "Are we targeting the right customers with a distinctive proposition?",
    steps: ["Segment by needs and value", "Score segment attractiveness and fit", "Choose targets", "Write positioning per target"],
  },
  {
    id: "competitive", name: "Competitive & Share-of-Wallet Analysis", category: "Strategy",
    description: "Quantify competitive pressure and how much of the customer's category spend we capture.",
    problemTypes: ["retention", "acquisition", "pricing", "brand", "loyalty"],
    keywords: ["competitor", "competition", "market share", "share of wallet", "switching", "new entrant"],
    requiredData: ["Market share / panel data", "Competitor pricing and offers", "Customer category spend"],
    answers: "Are we losing to competitors, and on what dimension?",
    steps: ["Benchmark price, offer and experience", "Estimate share of wallet by segment", "Identify switching triggers", "Prioritise defensive and offensive moves"],
  },
  {
    id: "clv", name: "Customer Lifetime Value Modelling", category: "Strategy",
    description: "Model CLV by segment and channel to steer acquisition and retention investment.",
    problemTypes: ["retention", "acquisition", "monetization", "loyalty", "paid_media"],
    keywords: ["ltv", "clv", "lifetime value", "ltv:cac", "payback", "unit economics"],
    requiredData: ["Transaction history", "Margin", "Acquisition source"],
    answers: "Which customers and channels create long-term value?",
    steps: ["Estimate retention and spend curves", "Compute margin-based CLV by segment/source", "Compare with CAC", "Reallocate budget to high-CLV sources"],
  },
  /* ------------------------------ Brand ------------------------------- */
  {
    id: "brand-funnel", name: "Brand Health Funnel", category: "Brand",
    description: "Track awareness → consideration → preference → purchase → loyalty against competitors.",
    problemTypes: ["brand", "acquisition"],
    keywords: ["awareness", "consideration", "brand", "perception", "share of search", "mental availability"],
    requiredData: ["Brand tracker or survey", "Share of search", "Social listening"],
    answers: "Is demand being lost at the top of the funnel?",
    steps: ["Measure funnel conversion vs competitors", "Find the leaking stage", "Diagnose distinctive assets and category entry points", "Balance brand vs activation spend"],
  },
  {
    id: "share-of-voice", name: "Share of Voice vs Share of Market", category: "Brand",
    description: "Compare spend share against market share to predict growth or decline.",
    problemTypes: ["brand", "paid_media", "acquisition"],
    keywords: ["share of voice", "sov", "excess share of voice", "media weight"],
    requiredData: ["Category media spend estimates", "Market share"],
    answers: "Are we investing enough to hold or grow share?",
    steps: ["Estimate SOV from media intelligence", "Compare with SOM", "Compute ESOV", "Set investment level"],
  },
  /* ------------------------------ Pricing ------------------------------ */
  {
    id: "price-elasticity", name: "Price & Promotion Elasticity", category: "Pricing",
    description: "Estimate how volume responds to price and promotions, including cannibalisation.",
    problemTypes: ["pricing", "monetization", "conversion"],
    keywords: ["price", "pricing", "elasticity", "discount", "promotion", "coupon"],
    requiredData: ["Price and volume history", "Promotion calendar", "Competitor prices"],
    answers: "Are we over- or under-priced, and do promotions create incremental profit?",
    steps: ["Build price/volume dataset", "Model elasticity by segment", "Measure promotion incrementality and pull-forward", "Set price and promo guardrails"],
  },
  {
    id: "value-based-pricing", name: "Value-Based Pricing & Packaging", category: "Pricing",
    description: "Align price tiers and packaging with willingness to pay and value metrics.",
    problemTypes: ["pricing", "monetization", "conversion", "pipeline"],
    keywords: ["packaging", "tiers", "plans", "willingness to pay", "upsell", "freemium"],
    requiredData: ["Willingness-to-pay research (e.g. Van Westendorp)", "Feature usage by plan"],
    answers: "Does our packaging capture value and guide customers to the right plan?",
    steps: ["Identify value metric", "Research WTP", "Design good/better/best tiers", "Test with cohorts"],
  },
  /* ------------------------------- B2B -------------------------------- */
  {
    id: "b2b-funnel", name: "B2B Demand Waterfall (Lead → Revenue)", category: "B2B",
    description: "Diagnose volume and conversion from inquiry to MQL, SQL, opportunity and closed-won.",
    problemTypes: ["pipeline", "acquisition", "conversion"],
    keywords: ["mql", "sql", "pipeline", "lead", "opportunit", "win rate", "sales cycle", "b2b"],
    requiredData: ["CRM stage history", "Lead source", "Velocity and win rates"],
    answers: "Is the pipeline problem volume, quality, conversion or velocity?",
    steps: ["Reconstruct the waterfall by source", "Compare stage conversion and velocity over time", "Check definition drift", "Fix the binding constraint"],
  },
  {
    id: "lead-scoring", name: "Lead Scoring & Sales–Marketing Alignment", category: "B2B",
    description: "Combine fit and intent signals and align SLAs between teams.",
    problemTypes: ["pipeline", "conversion"],
    keywords: ["lead scoring", "lead quality", "sla", "handoff", "intent data"],
    requiredData: ["Firmographics", "Engagement signals", "Outcome labels"],
    answers: "Are the right leads reaching sales at the right time?",
    steps: ["Define ICP and fit score", "Add behavioural/intent score", "Calibrate against closed-won", "Agree SLAs and feedback loop"],
  },
  {
    id: "abm", name: "Account-Based Marketing (ABM)", category: "B2B",
    description: "Concentrate effort on high-value target accounts with coordinated plays.",
    problemTypes: ["pipeline", "acquisition", "monetization"],
    keywords: ["abm", "account-based", "enterprise", "target accounts", "buying committee"],
    requiredData: ["Target account list", "Account engagement", "Buying-committee coverage"],
    answers: "Are we winning the accounts that matter most?",
    steps: ["Tier accounts", "Map buying committees", "Design 1:1 / 1:few plays", "Measure account progression"],
  },
  /* ---------------------------- Paid media ---------------------------- */
  {
    id: "paid-efficiency", name: "Paid Media Efficiency (ROAS / MER / CAC)", category: "Paid media",
    description: "Decompose paid performance into CPM, CTR, CVR and AOV by channel, audience and creative.",
    problemTypes: ["paid_media", "acquisition"],
    keywords: ["roas", "cpa", "cpm", "ctr", "paid", "ads", "mer", "media efficiency"],
    requiredData: ["Spend and conversions by channel/campaign", "Creative-level metrics", "Blended revenue (MER)"],
    answers: "Which component of the paid funnel is degrading, and where?",
    steps: ["Decompose ROAS = CVR × AOV ÷ (CPM/CTR)", "Trend each driver", "Isolate channel/audience/creative effects", "Reallocate and refresh"],
  },
  {
    id: "creative-testing", name: "Creative Testing & Fatigue", category: "Paid media",
    description: "Systematically test hooks, formats and messages; detect fatigue early.",
    problemTypes: ["paid_media", "brand", "conversion"],
    keywords: ["creative", "fatigue", "ad copy", "hooks", "ugc", "frequency"],
    requiredData: ["Creative-level performance", "Frequency"],
    answers: "Are we running out of effective creative?",
    steps: ["Tag creatives by concept/format", "Track decay vs frequency", "Run structured concept tests", "Set refresh cadence"],
  },
  {
    id: "mmm", name: "Marketing Mix Modelling (MMM)", category: "Measurement",
    description: "Estimate channel contribution and saturation with aggregate time-series data.",
    problemTypes: ["measurement", "paid_media", "brand", "acquisition"],
    keywords: ["mmm", "marketing mix", "budget allocation", "saturation", "diminishing returns", "offline"],
    requiredData: ["2+ years weekly spend and outcomes", "Seasonality and pricing", "External factors"],
    answers: "How should budget be allocated across channels, including offline and brand?",
    steps: ["Assemble weekly dataset", "Fit model with adstock/saturation", "Calibrate with experiments", "Optimise budget"],
  },
  {
    id: "signal-loss", name: "Tracking & Signal-Loss Audit", category: "Measurement",
    description: "Check tagging, consent, server-side events and platform signal quality.",
    problemTypes: ["measurement", "paid_media", "conversion"],
    keywords: ["tracking", "pixel", "conversion api", "ios", "cookie", "consent mode", "tag", "data loss"],
    requiredData: ["Tag inventory", "Consent rates", "Platform vs backend conversion counts"],
    answers: "Is the 'decline' real or a measurement artefact?",
    steps: ["Reconcile platform vs backend", "Audit tags and consent", "Implement server-side/CAPI", "Re-baseline KPIs"],
  },
  /* -------------------------- SEO & content --------------------------- */
  {
    id: "seo-audit", name: "Technical & Content SEO Audit", category: "SEO & content",
    description: "Diagnose crawlability, indexation, content quality and intent coverage.",
    problemTypes: ["seo_content", "acquisition"],
    keywords: ["seo", "organic", "ranking", "indexing", "core update", "migration", "content"],
    requiredData: ["Search Console", "Crawl data", "Ranking history", "Release log"],
    answers: "Why did organic visibility change, and what recovers it?",
    steps: ["Align drop with updates/releases", "Check technical health", "Assess content quality and intent fit", "Prioritise fixes by traffic value"],
  },
  {
    id: "content-strategy", name: "Content Strategy & Topic Clusters", category: "SEO & content",
    description: "Map content to journey stages and intents; build topical authority.",
    problemTypes: ["seo_content", "brand", "pipeline"],
    keywords: ["content", "blog", "thought leadership", "topic", "editorial"],
    requiredData: ["Content inventory and performance", "Keyword/intent research"],
    answers: "Does our content earn attention and move people through the journey?",
    steps: ["Audit content by stage and intent", "Find gaps vs demand", "Build clusters", "Measure assisted conversions"],
  },
  /* ---------------------------- Advocacy ----------------------------- */
  {
    id: "nps-drivers", name: "NPS / VoC Driver Analysis", category: "Advocacy",
    description: "Link experience drivers to loyalty and churn using feedback data.",
    problemTypes: ["advocacy", "retention", "loyalty", "brand"],
    keywords: ["nps", "csat", "reviews", "complaints", "feedback", "satisfaction"],
    requiredData: ["Survey responses with verbatims", "Linked behavioural data"],
    answers: "Which experience issues drive detractors and churn?",
    steps: ["Theme verbatims", "Run key-driver analysis", "Link to churn/spend", "Close the loop with owners"],
  },
  {
    id: "referral-loop", name: "Referral & Viral Loop Design", category: "Advocacy",
    description: "Design incentives and moments that turn customers into acquisition.",
    problemTypes: ["advocacy", "acquisition", "app_growth"],
    keywords: ["referral", "invite", "viral", "word of mouth", "ambassador"],
    requiredData: ["Referral volumes and conversion", "Promoter identification"],
    answers: "Can satisfied customers become a scalable acquisition channel?",
    steps: ["Identify promoter moments", "Design two-sided incentive", "Reduce sharing friction", "Measure k-factor and fraud"],
  },
  /* ------------------------------- App -------------------------------- */
  {
    id: "app-growth", name: "App Growth Funnel (ASO → Retention)", category: "App",
    description: "Diagnose store conversion, onboarding, permissions and early retention.",
    problemTypes: ["app_growth", "activation", "retention"],
    keywords: ["app", "install", "aso", "uninstall", "push opt-in", "store rating"],
    requiredData: ["Store analytics", "Install attribution", "In-app events", "Retention curves"],
    answers: "Where does the app lose users from store page to habit?",
    steps: ["Benchmark store CVR", "Map onboarding drop-off", "Optimise permission prompts", "Build D1/D7/D30 habit loops"],
  },
  /* ------------------------- MarTech & data -------------------------- */
  {
    id: "data-governance", name: "Data Quality, Identity & Consent Readiness", category: "MarTech",
    description: "Assess identity resolution, data quality, latency and consent for activation.",
    problemTypes: ["martech", "personalization", "crm", "measurement"],
    keywords: ["data quality", "identity", "single customer view", "consent", "gdpr", "dpdp", "first-party"],
    requiredData: ["Data inventory", "Match rates", "Consent coverage"],
    answers: "Is our data fit to power targeting, personalisation and measurement?",
    steps: ["Inventory sources", "Measure match rate and completeness", "Assess consent coverage", "Define the minimum viable data foundation"],
  },
  {
    id: "use-case-roadmap", name: "MarTech Use-Case Roadmap", category: "MarTech",
    description: "Prioritise marketing use cases by value and feasibility on the current stack.",
    problemTypes: ["martech", "personalization", "crm"],
    keywords: ["roadmap", "use case", "platform", "implementation", "vendor selection", "stack"],
    requiredData: ["Use-case backlog", "Current vendor capabilities", "Team capacity"],
    answers: "Which use cases should we launch first on the stack we already own?",
    steps: ["List use cases", "Score value × feasibility", "Map to existing vendor features", "Sequence into quarters"],
  },
];

export function getFramework(id: string): DiagnosticFramework | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}
