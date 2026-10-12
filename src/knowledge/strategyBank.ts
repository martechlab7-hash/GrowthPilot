import type { StrategyType } from "@/domain/types";
import { QUESTION_BANK, type BankQuestion } from "./questionBank";

/**
 * Strategy Builder interview. Eleven discovery areas, asked in order of
 * information value and branching on earlier answers: paid-media questions
 * only for businesses that run or plan ads, revenue follow-ups only when the
 * objective is revenue, current-performance questions only when there is an
 * existing programme, launch questions only for GTM and launches, and
 * competitor questions only when research is switched on.
 */

const q = (b: Omit<BankQuestion, "critical" | "origin"> & { critical?: boolean }): BankQuestion => ({ critical: false, origin: "bank", ...b });

/** Reuse a diagnostic-bank question, optionally adjusted. */
function from(id: string, patch: Partial<BankQuestion> = {}): BankQuestion {
  const base = QUESTION_BANK.find((x) => x.id === id);
  if (!base) throw new Error(`Unknown bank question ${id}`);
  return { ...base, ...patch, when: patch.when === undefined ? base.when && stripProblemTypes(base.when) : patch.when };
}

/** Diagnostic problem-type gates do not apply to strategy cases. */
function stripProblemTypes(when: NonNullable<BankQuestion["when"]>): BankQuestion["when"] {
  const { problemTypes: _p, ...rest } = when;
  void _p;
  return Object.keys(rest).length ? rest : undefined;
}

const EXISTING: StrategyType[] = ["existing", "growth_problem", "retention", "full"];
const LAUNCH: StrategyType[] = ["gtm", "launch", "full"];
const REVENUE = ["Revenue growth", "Profitability"];
const RETENTION = ["Retention & loyalty"];

export const STRATEGY_CHANNELS = [
  "SEO", "Content marketing", "Google Ads", "Meta Ads", "LinkedIn Ads", "YouTube Ads", "Other paid media",
  "Email", "SMS", "WhatsApp", "RCS", "Web push", "App push", "Influencer marketing", "Affiliate marketing",
  "Organic social media", "Referral / loyalty", "Events / offline", "Partnerships", "Sales outreach",
];

export const STRATEGY_BANK: BankQuestion[] = [
  /* ------------------------- 1. Business context ------------------------- */
  from("biz-sales-channel"),
  q({
    id: "s-offer", key: "business.offering", stage: "business", category: "BUSINESS",
    prompt: "What do you sell? List your main products or services.",
    why: "The strategy has to be built around what actually earns money, and which offers matter most.",
    input: "longtext", placeholder: "e.g. Running shoes (60% of revenue), apparel, a premium fitting service",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  from("biz-industry"),
  from("biz-model", { options: ["B2B", "B2C", "D2C", "Marketplace", "Subscription", "Hybrid"] }),
  q({
    id: "s-stage", key: "business.company_stage", stage: "business", category: "BUSINESS",
    prompt: "What stage is the business at?",
    why: "A pre-launch brand needs awareness and proof; a mature one needs efficiency and retention. The plan differs.",
    input: "select", options: ["Pre-launch", "New (under 2 years)", "Growing", "Mature", "Turnaround"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-markets", key: "business.geography", stage: "business", category: "BUSINESS",
    prompt: "Which markets do you serve (countries, cities or regions)?",
    why: "Channel mix, languages, regulation and competition all depend on the market.",
    input: "text", placeholder: "e.g. India (Mumbai, Pune), UAE",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-objective", key: "business.strategy_objective", stage: "business", category: "BUSINESS",
    prompt: "What is the primary objective of this strategy?",
    why: "One primary objective keeps the plan focused; everything else becomes a constraint or a secondary KPI.",
    input: "select",
    options: ["Revenue growth", "Customer acquisition", "Retention & loyalty", "Go-to-market / launch", "Leads / pipeline", "Brand awareness", "Profitability"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-priorities", key: "business.top_priorities", stage: "business", category: "BUSINESS",
    prompt: "Which three business priorities matter most right now?",
    why: "Priorities break ties between good ideas and tell me what not to recommend.",
    input: "multiselect",
    options: ["Grow revenue", "Win new customers", "Keep existing customers", "Improve margins", "Lower acquisition cost", "Build the brand", "Enter new markets", "Launch new products", "Improve data and measurement"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-baseline", key: "performance.business_baseline", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What is your current baseline: revenue, orders or leads per month or year?",
    why: "Targets and budgets are only meaningful against a baseline. A range is fine, or say it is confidential.",
    input: "text", placeholder: "e.g. ₹4 Cr revenue a month, ~9,000 orders",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
    when: { strategyTypes: EXISTING },
  }),
  q({
    id: "s-target", key: "performance.target_outcome", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What outcome are you aiming for, and by when?",
    why: "The size and deadline of the target decide which levers are big enough and fast enough.",
    input: "text", placeholder: "e.g. +30% net revenue by March 2027",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-revenue-definition", key: "performance.revenue_definition", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "When you say revenue, which number do you mean?",
    why: "Gross revenue, net revenue, bookings and contribution margin move differently. Discount-led growth can raise one and hurt another.",
    input: "select", options: ["Gross revenue", "Net revenue (after discounts and returns)", "Bookings / orders", "Contribution margin"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5,
    when: { answered: { key: "business.strategy_objective", anyOf: REVENUE } },
  }),
  from("biz-atv", { when: { answered: { key: "business.strategy_objective", anyOf: REVENUE } } }),
  q({
    id: "s-conversion", key: "performance.conversion_rate", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What share of visitors or leads end up buying?",
    why: "Conversion tells me whether growth should come from more traffic or from converting what you already get.",
    input: "text", placeholder: "e.g. 1.8% of website sessions; 20% of store visitors",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { answered: { key: "business.strategy_objective", anyOf: [...REVENUE, "Customer acquisition", "Leads / pipeline"] } },
  }),
  from("eco-margin", { when: { answered: { key: "business.strategy_objective", anyOf: [...REVENUE, "Customer acquisition"] } } }),
  q({
    id: "s-repeat", key: "performance.repeat_rate", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "How many customers buy again, and how many stop buying (churn)?",
    why: "Repeat and churn rates show where the retention gap is and how much it is worth.",
    input: "text", placeholder: "e.g. 28% buy again within 6 months; 4% monthly churn",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { answered: { key: "business.strategy_objective", anyOf: [...RETENTION, "Revenue growth"] } },
  }),
  q({
    id: "s-clv", key: "economics.customer_lifetime_value", stage: "economics", category: "ECONOMICS",
    prompt: "Do you know the lifetime value of a customer?",
    why: "Lifetime value caps how much you can spend to win or keep a customer.",
    input: "text", placeholder: "e.g. ₹12,000 over 2 years, or unknown",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { answered: { key: "business.strategy_objective", anyOf: [...RETENTION, "Customer acquisition", "Revenue growth"] } },
  }),
  from("mkt-style", { when: { strategyTypes: ["retention", "existing", "full"] } }),
  q({
    id: "s-challenges", key: "performance.growth_challenges", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What are the biggest challenges holding growth back?",
    why: "Your view of the blockers is the starting hypothesis; I will test it against the numbers.",
    input: "multiselect",
    options: ["Low awareness", "Too few visitors or leads", "Poor conversion", "Weak repeat / retention", "High acquisition cost", "Pricing pressure", "Strong competition", "Limited budget", "Limited team or capacity", "Poor data or measurement", "Unclear positioning"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
  }),

  /* --------------------------- Launch and GTM ---------------------------- */
  q({
    id: "s-launch-what", key: "business.launch_subject", stage: "business", category: "BUSINESS",
    prompt: "What exactly are you launching or expanding into, and why now?",
    why: "A GTM plan starts from what is new (product, market or segment) and the reason the timing is right.",
    input: "longtext", placeholder: "e.g. A subscription plan for small clinics in Pune, launching in February",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
    when: { strategyTypes: LAUNCH },
  }),
  q({
    id: "s-launch-proof", key: "business.launch_validation", stage: "business", category: "BUSINESS",
    prompt: "How well has demand been validated?",
    why: "Untested demand calls for a pilot and learning budget before a big launch.",
    input: "select", options: ["Validated with paying customers", "Some early signals (waitlist, pilots, interviews)", "Untested so far"],
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5,
    when: { strategyTypes: LAUNCH },
  }),
  q({
    id: "s-launch-pricing", key: "business.launch_pricing", stage: "business", category: "BUSINESS",
    prompt: "What price and launch offer are you planning?",
    why: "Price and offer shape positioning, the target segment and the channels that can pay back.",
    input: "text", placeholder: "e.g. ₹999/month, first month free for early sign-ups",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
    when: { strategyTypes: LAUNCH },
  }),
  q({
    id: "s-launch-distribution", key: "business.launch_distribution", stage: "business", category: "BUSINESS",
    prompt: "Where will customers be able to buy it?",
    why: "Distribution decides which channels can convert demand into sales.",
    input: "multiselect", options: ["Own website or app", "Own stores", "Marketplaces", "Retail partners", "Distributors / dealers", "Direct sales team", "Partners / resellers"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
    when: { strategyTypes: LAUNCH },
  }),

  /* ---------------------- 3. Audience and market ------------------------ */
  q({
    id: "s-icp", key: "customer.ideal_customer", stage: "customer", category: "CUSTOMER",
    prompt: "Who is your ideal {customer}?",
    why: "Every channel, message and budget decision depends on who we are trying to reach.",
    input: "longtext", placeholder: "e.g. Urban runners aged 25–40 who train 3+ times a week; or mid-size clinics with 5–20 doctors",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-segments", key: "customer.priority_segments", stage: "customer", category: "CUSTOMER",
    prompt: "Which {customer} segments matter most for this strategy?",
    why: "Focusing on a few segments beats a plan that tries to reach everyone.",
    input: "multiselect", options: ["New customers", "Repeat customers", "High-value customers", "Dormant / lapsed customers", "Enterprise", "SMB", "Young / students", "Families", "Professionals"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-problem", key: "customer.problem_solved", stage: "customer", category: "CUSTOMER",
    prompt: "What problem do you solve for {customers}, and what makes them buy?",
    why: "Needs and purchase motivations become the messaging framework.",
    input: "longtext",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-why-us", key: "customer.why_choose_us", stage: "customer", category: "CUSTOMER",
    prompt: "Why do {customers} choose you over the alternatives?",
    why: "Real differentiators and proof points carry the positioning; claims you can't prove do not.",
    input: "longtext",
    businessImpact: 5, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "s-objections", key: "customer.objections", stage: "customer", category: "CUSTOMER",
    prompt: "What stops people from buying?",
    why: "Objections decide what the funnel and the messages must overcome.",
    input: "multiselect", options: ["Price", "Trust / credibility", "Competitors", "Low awareness", "Hard to buy (friction)", "Availability or delivery", "Switching cost", "Not sure"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-journey", key: "customer.buying_journey", stage: "customer", category: "CUSTOMER",
    prompt: "How do {customers} discover, compare and buy today?",
    why: "The journey shows where each channel should play a role.",
    input: "longtext", placeholder: "e.g. Instagram and friends → compare on Google and marketplaces → buy in store",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-market-trend", key: "customer.market_trend", stage: "customer", category: "CUSTOMER",
    prompt: "Is your market growing, stable, declining or changing fast?",
    why: "Growing markets reward share-of-voice; shrinking ones reward retention and efficiency.",
    input: "select", options: ["Growing", "Stable", "Declining", "Changing fast", "Not sure"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),

  /* -------------------- 4. Current marketing performance ------------------ */
  q({
    id: "s-volumes", key: "performance.monthly_volumes", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Roughly what do you get per month: leads, orders or bookings, and how much of it is from marketing?",
    why: "Volumes and the share driven by marketing are the baseline every recommendation is measured against.",
    input: "longtext",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 4,
    when: { strategyTypes: EXISTING },
  }),
  q({
    id: "s-unit-economics", key: "economics.unit_economics", stage: "economics", category: "ECONOMICS",
    prompt: "Do you know your cost to acquire a customer (CAC) and return on ad spend (ROAS)?",
    why: "Unit economics decide which channels can be scaled profitably. Unknown is fine: I'll plan how to measure them.",
    input: "text", placeholder: "e.g. CAC ~₹900, blended ROAS 3.1 (platform-reported)",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { strategyTypes: EXISTING },
  }),
  q({
    id: "s-worked", key: "performance.what_worked", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What has worked, what has failed, and what have you already tried?",
    why: "Past results tell me what to scale and stop me recommending what already failed.",
    input: "longtext",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { strategyTypes: EXISTING },
  }),
  q({
    id: "s-crm-performance", key: "performance.crm_performance", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "How do your email, SMS, WhatsApp or push messages perform (opens, clicks, opt-outs)?",
    why: "Owned channels are usually the cheapest lever; their health decides how hard we can lean on them.",
    input: "text",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { strategyTypes: EXISTING, requiresMessaging: true },
  }),
  q({
    id: "s-tracking", key: "measurement.tracking_quality", stage: "measurement", category: "DATA",
    prompt: "How reliable is your tracking and reporting today?",
    why: "If results can't be measured, the plan must start with a measurement workstream before promising optimisation.",
    input: "select", options: ["Reliable dashboards and tracking", "Partial: some gaps", "Mostly manual spreadsheets", "Little or none"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5,
  }),

  /* ----------------------- 5. Technology stack -------------------------- */
  from("tech-vendors", { critical: false }),
  from("off-systems", { critical: false }),
  q({
    id: "s-stack-usage", key: "technology.stack_usage", stage: "technology", category: "TECHNOLOGY",
    prompt: "How well are these tools actually used?",
    why: "Licensed-but-unused tools are the fastest quick wins; I'll separate them from new investments.",
    input: "select", options: ["Live and well used", "Licensed but under-used", "Partly configured", "Mostly manual"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { requiresKnown: ["technology.vendors"] },
  }),
  q({
    id: "s-capabilities", key: "data.capabilities", stage: "data", category: "DATA",
    prompt: "Which of these can you do today?",
    why: "Consent, identity and real-time audiences decide which lifecycle and personalisation ideas are feasible now.",
    input: "multiselect",
    options: ["Consent & preference management", "Suppression lists", "Recognise customers across channels", "Build audiences in real time", "Trigger journeys on events", "None of these"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { channels: ["online"] },
  }),
  from("tech-integration", { when: { requiresKnown: ["technology.vendors"] } }),
  q({
    id: "s-stack-gaps", key: "technology.missing_capabilities", stage: "technology", category: "TECHNOLOGY",
    prompt: "Which capabilities are missing or unreliable, and are there licensing or engineering limits?",
    why: "Constraints decide what is a quick win versus a technology investment.",
    input: "longtext",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),

  /* --------------------------- 6. Channels ------------------------------ */
  q({
    id: "s-channels", key: "marketing.channels", stage: "activation", category: "MARKETING",
    prompt: "Which channels are live today?",
    why: "I build on what already runs before adding anything new.",
    input: "multiselect", options: STRATEGY_CHANNELS,
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-channels-planned", key: "marketing.channels_planned", stage: "activation", category: "MARKETING",
    prompt: "Which channels are you considering adding?",
    why: "Planned channels get evaluated against the alternatives rather than assumed.",
    input: "multiselect", options: STRATEGY_CHANNELS,
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-channels-excluded", key: "marketing.channels_excluded", stage: "activation", category: "MARKETING",
    prompt: "Any channels I should not recommend?",
    why: "Brand, legal or past experience can rule channels out; I won't propose them.",
    input: "multiselect", options: STRATEGY_CHANNELS,
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "s-channel-results", key: "marketing.channel_results", stage: "activation", category: "MARKETING",
    prompt: "For your main channels, what do they cost and deliver each month?",
    why: "Spend, volume and cost per result per channel show where to optimise, scale or stop.",
    input: "longtext", placeholder: "e.g. Google Ads ₹6L/month, 900 leads, CPL ₹670; Email 4 sends/week, 2% CTR",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { requiresKnown: ["marketing.channels"], strategyTypes: EXISTING },
  }),
  from("mkt-cadence", { when: { requiresMessaging: true, strategyTypes: ["retention", "existing", "full"] } }),
  q({
    id: "s-channel-limits", key: "marketing.channel_limits", stage: "activation", category: "MARKETING",
    prompt: "Are any channels limited by audience size, consent, creative or team capacity?",
    why: "Limits cap how far a channel can be scaled, whatever its results.",
    input: "longtext",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 3,
    when: { requiresKnown: ["marketing.channels"] },
  }),

  /* --------------------- 7. Paid advertising and budget ------------------- */
  q({
    id: "s-paid", key: "marketing.paid_status", stage: "economics", category: "MARKETING",
    prompt: "Are you running paid ads today?",
    why: "Paid media gets its own plan: platforms, budgets, tracking and scaling rules.",
    input: "select", options: ["Yes, running ads", "Planning to start", "No"],
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5,
  }),
  q({
    id: "s-paid-platforms", key: "marketing.paid_platforms", stage: "economics", category: "MARKETING",
    prompt: "Which ad platforms are you using or planning?",
    why: "Each platform has different targeting, costs and tracking needs.",
    input: "multiselect", options: ["Google Search", "Google Shopping / Performance Max", "Meta (Facebook, Instagram)", "LinkedIn", "YouTube", "TikTok", "Programmatic / display", "Marketplace ads"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
    when: { answered: { key: "marketing.paid_status", anyOf: ["Yes, running ads", "Planning to start"] } },
  }),
  q({
    id: "s-paid-spend", key: "economics.paid_spend", stage: "economics", category: "ECONOMICS",
    prompt: "What is your monthly ad spend, in total and per platform?",
    why: "Current spend is the base the budget scenarios start from.",
    input: "text", placeholder: "e.g. ₹10L total: Google ₹6L, Meta ₹4L",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 5,
    when: { answered: { key: "marketing.paid_status", anyOf: ["Yes, running ads"] } },
  }),
  q({
    id: "s-paid-objective", key: "marketing.paid_objective", stage: "economics", category: "MARKETING",
    prompt: "What are the ads meant to deliver?",
    why: "Campaign objectives must match the business objective or spend optimises for the wrong thing.",
    input: "select", options: ["Leads", "Sales", "Bookings", "App installs", "Awareness", "Store visits"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { answered: { key: "marketing.paid_status", anyOf: ["Yes, running ads", "Planning to start"] } },
  }),
  q({
    id: "s-paid-results", key: "performance.paid_results", stage: "economics", category: "PERFORMANCE",
    prompt: "What results do the ads get: cost per lead or customer, ROAS, conversion rate?",
    why: "Results, read alongside tracking quality, decide where budget can move. Platform-reported ROAS alone is never enough to scale.",
    input: "text",
    businessImpact: 4, diagnosticValue: 5, decisionRelevance: 4,
    when: { answered: { key: "marketing.paid_status", anyOf: ["Yes, running ads"] } },
  }),
  q({
    id: "s-paid-tracking", key: "measurement.conversion_tracking", stage: "measurement", category: "DATA",
    prompt: "How is conversion tracking set up for ads?",
    why: "Without reliable conversion signals, platforms optimise blind and reported ROAS overstates impact.",
    input: "multiselect", options: ["Pixel / tag", "App SDK", "Server-side events (Conversions API)", "Offline conversion uploads", "Not set up"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
    when: { answered: { key: "marketing.paid_status", anyOf: ["Yes, running ads", "Planning to start"] } },
  }),
  q({
    id: "s-budget", key: "economics.monthly_budget", stage: "economics", category: "ECONOMICS",
    prompt: "What is the monthly marketing budget ceiling, across all channels?",
    why: "Budget scenarios are built inside this ceiling; anything above it is shown as an option, never assumed.",
    input: "currency",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-budget-flex", key: "economics.budget_flexibility", stage: "economics", category: "ECONOMICS",
    prompt: "How flexible is the budget?",
    why: "This decides whether scenarios can reallocate or scale after proof.",
    input: "select", options: ["Fixed", "Can be reallocated between channels", "Can scale once results are proven"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "s-creative-capacity", key: "operations.creative_capacity", stage: "business", category: "OPERATIONS",
    prompt: "How much new creative and content can the team produce?",
    why: "Creative capacity often caps paid and social more than budget does.",
    input: "select", options: ["New assets every week", "A few per month", "Occasionally", "Very limited"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),

  /* ------------------ 8. Competitor and market research ------------------- */
  q({
    id: "s-comp-names", key: "competition.names", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "Which competitors, brands or substitutes should I research?",
    why: "I research only what you name, using their public pages. Private spend or results are never estimated.",
    input: "text", placeholder: "e.g. Brand A (brand-a.com), Brand B, local stores",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { competitorResearch: true },
  }),
  q({
    id: "s-comp-areas", key: "competition.research_areas", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What should the research look at?",
    why: "Focusing the research keeps it useful and evidence-based.",
    input: "multiselect", options: ["Positioning & messaging", "Visible campaigns & creative", "Search visibility & content", "Offers & landing pages", "Social presence", "Launches & partnerships", "Reviews & complaints"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
    when: { competitorResearch: true },
  }),
  q({
    id: "s-comp-questions", key: "competition.questions", stage: "diagnosis", category: "PERFORMANCE",
    prompt: "What strategic questions should the research answer?",
    why: "Clear questions turn research into decisions.",
    input: "longtext", placeholder: "e.g. How do rivals price trials? Which messages do they lead with?",
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
    when: { competitorResearch: true },
  }),

  /* ---------------- 9. Timeline, urgency and constraints ------------------ */
  q({
    id: "s-team", key: "operations.team_capacity", stage: "business", category: "OPERATIONS",
    prompt: "Who will execute the plan: team size, roles and roughly how much time they have each week?",
    why: "The roadmap is scheduled against real capacity; an aggressive plan only compresses work when people are available.",
    input: "longtext", placeholder: "e.g. 1 marketing manager, 1 designer (half-time), agency for paid media",
    businessImpact: 5, diagnosticValue: 5, decisionRelevance: 5, critical: true,
  }),
  q({
    id: "s-approvals", key: "operations.approval_cycle", stage: "business", category: "OPERATIONS",
    prompt: "How long do approvals (brand, legal, budget) usually take?",
    why: "Approvals are never compressed in a faster plan, so they shape the critical path.",
    input: "select", options: ["A few days", "About a week", "2–4 weeks", "More than a month"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "s-dependencies", key: "operations.dependencies", stage: "business", category: "OPERATIONS",
    prompt: "Which other teams does marketing depend on to deliver?",
    why: "Cross-team dependencies are the usual cause of slipped launches.",
    input: "multiselect", options: ["Product", "Engineering / IT", "Sales", "Finance", "Legal / compliance", "Store or field operations", "Agency"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-seasonality", key: "operations.seasonality", stage: "business", category: "OPERATIONS",
    prompt: "Are there seasonal peaks, holidays, events or deadlines the plan must respect?",
    why: "Launches should land before peaks, not during them.",
    input: "text", placeholder: "e.g. Diwali is 40% of annual sales; trade show in March",
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  from("ops-constraints"),

  /* --------------- 10. Positioning, offers and content ------------------- */
  q({
    id: "s-value-prop", key: "marketing.value_proposition", stage: "activation", category: "MARKETING",
    prompt: "What is your main value proposition, in a sentence or two?",
    why: "The messaging framework and every campaign build on it.",
    input: "longtext",
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 5,
  }),
  q({
    id: "s-offers", key: "marketing.offers_available", stage: "activation", category: "MARKETING",
    prompt: "Which offers or incentives can you use?",
    why: "Available levers decide which campaign concepts are realistic.",
    input: "multiselect", options: ["Discounts", "Bundles", "Free trial / sample", "Loyalty rewards", "Referral rewards", "Financing / EMI", "Free delivery", "None"],
    businessImpact: 3, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-content", key: "marketing.content_assets", stage: "activation", category: "MARKETING",
    prompt: "What content and creative already exists, and which formats can you produce regularly?",
    why: "Content plans must match what the team can actually make.",
    input: "longtext",
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
  q({
    id: "s-brand-rules", key: "marketing.brand_rules", stage: "activation", category: "MARKETING",
    prompt: "Tone of voice, languages, and any claims or promotions that need legal or brand approval?",
    why: "The plan must respect brand and compliance rules from day one.",
    input: "longtext",
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),

  /* ------------- 11. Measurement, attribution and governance -------------- */
  q({
    id: "s-kpis-defined", key: "measurement.kpis_defined", stage: "measurement", category: "DATA",
    prompt: "Do you have agreed KPIs and targets for marketing?",
    why: "Without agreed KPIs, success gets argued about after the fact.",
    input: "select", options: ["Yes, with targets", "Partly", "No"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-source-truth", key: "measurement.source_of_truth", stage: "measurement", category: "DATA",
    prompt: "Is there one trusted source for revenue and campaign results?",
    why: "Conflicting numbers stall decisions; fixing that may be the first workstream.",
    input: "select", options: ["One trusted dashboard", "Several sources that disagree", "Manual spreadsheets", "None"],
    businessImpact: 4, diagnosticValue: 4, decisionRelevance: 4,
  }),
  q({
    id: "s-utm", key: "measurement.utm_taxonomy", stage: "measurement", category: "DATA",
    prompt: "Are campaign links and names tagged consistently (UTMs, naming conventions)?",
    why: "Consistent tagging is what makes channel results comparable.",
    input: "select", options: ["Consistent", "Inconsistent", "Not used"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 3,
    when: { channels: ["online"] },
  }),
  from("meas-experimentation"),
  q({
    id: "s-stop-rules", key: "measurement.stop_rules", stage: "measurement", category: "DATA",
    prompt: "Is there a process for stopping campaigns that miss their targets?",
    why: "Clear stop rules protect budget and make bold tests safe to run.",
    input: "select", options: ["Yes, a formal process", "Informal", "No"],
    businessImpact: 3, diagnosticValue: 3, decisionRelevance: 4,
  }),
];
