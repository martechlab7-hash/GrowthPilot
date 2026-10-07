import type { FrameworkGuide } from "./types";

export const GUIDES_PART2: Record<string, FrameworkGuide> = {
  /* ------------------------------------------------------------------ */
  winback: {
    overview: [
      "Dormancy and winback analysis identifies customers who have stopped buying or engaging, works out which of them are worth the effort of bringing back, and designs the right approach for each group. It treats lapsed customers not as one list to blast with a discount, but as a portfolio with very different values and probabilities of return.",
      "The core idea is that reactivation probability falls steeply with time since last activity, while the value of a returning customer depends on what they were worth before they lapsed. Combining the two (how valuable they were, and how likely they are to come back) tells you where to spend and where to stop.",
      "The framework answers: which lapsed customers are worth winning back, through which message or offer, and how much incremental revenue does the programme really generate once you compare against a held-out control group?",
    ],
    whenToUse: [
      "The active customer base is shrinking even though acquisition volumes are steady.",
      "A large share of the CRM database has not purchased or logged in for many months and nobody owns it.",
      "Winback campaigns exist but rely on blanket discounts and their incremental effect has never been measured.",
      "Customer acquisition costs are rising and reactivating known customers may be cheaper than finding new ones.",
      "A recent price change, service failure or competitor launch has caused a visible spike in lapsing.",
    ],
    howItWorks: [
      {
        step: "Define dormancy windows",
        detail: "Use the natural purchase cycle to decide when a customer counts as at risk, lapsed and lost. For a grocery app that might be 30, 60 and 120 days; for an airline 12, 18 and 24 months. Base the thresholds on the distribution of inter-purchase gaps, for example the point beyond which 80–90% of active customers would already have bought again.",
      },
      {
        step: "Score previous value",
        detail: "For every lapsed customer calculate what they were worth before lapsing: historic spend, margin, frequency and tenure. This tells you how much you can afford to invest in bringing each one back and stops you spending premium incentives on low-value one-off buyers.",
      },
      {
        step: "Score intent to return",
        detail: "Look for signals that a customer is still warm: email opens, site or app visits, search activity, abandoned baskets, loyalty point balances, or a recent service complaint that explains the lapse. Combine them with time since last purchase into a simple propensity score or a high/medium/low band.",
      },
      {
        step: "Segment and design treatments",
        detail: "Cross value with intent to form a small grid. High-value, high-intent customers often need a reminder or a service fix rather than a discount; high-value, low-intent customers may justify a stronger offer or a personal call; low-value, low-intent customers usually get a low-cost touch or are left alone. Address the reason for lapse where known, not just the price.",
      },
      {
        step: "Hold out a control group",
        detail: "Randomly keep 10–20% of each segment out of the campaign. Some lapsed customers return on their own, so the true effect of winback is the difference between the treated group and the control, not the raw number who came back.",
      },
      {
        step: "Measure and recalibrate",
        detail: "Track reactivation rate, incremental revenue, cost per incremental reactivation and, critically, whether reactivated customers stay. Feed results back into the windows, scores and offers, and retire treatments that do not beat control.",
      },
    ],
    plainWords:
      "Imagine you run a lemonade stand and some regulars have stopped coming by. Some of them used to buy a big jug every day, others only bought one cup once. It makes sense to go and say hello to the big-jug regulars first, find out why they stopped, and maybe fix the problem, rather than giving free lemonade to everyone who ever walked past. And to know whether your hello actually worked, you leave a few regulars alone and see whether they come back anyway.",
    examples: [
      {
        title: "Online fashion retailer",
        situation: "An e-commerce fashion brand had 400,000 customers with no purchase in over 180 days. Its standard winback email offered 25% off to all of them and reported a 4% reactivation rate.",
        analysis: "A holdout showed 2.5% of untreated lapsed customers returned anyway, so the true lift was only 1.5 points, and much of the discount went to people who would have bought at full price. Splitting by previous value and recent site visits showed that high-value customers who had browsed in the last 30 days returned at 9% with a simple new-arrivals email and no discount.",
        outcome: "The retailer moved to three tiers: content-only for warm high-value customers, a 15% offer for cooler mid-value ones and no contact for low-value customers lapsed over a year. Illustratively, incremental revenue held steady while discount cost fell by around 60%.",
      },
      {
        title: "Airline frequent flyers",
        situation: "A regional airline saw a group of formerly frequent business travellers stop flying after a schedule change removed an early-morning departure.",
        analysis: "Grouping lapsed flyers by previous trips and by route showed the lapse was concentrated on two routes and among customers with 10+ trips a year. Intent signals (searches on the airline's site that ended without booking) showed many were still looking.",
        outcome: "Rather than a fare discount, the airline sent a targeted message once a replacement early slot was restored, plus a status-match extension. In this illustration reactivation among the targeted group reached 22% versus 6% in the control.",
      },
      {
        title: "SaaS subscription",
        situation: "A project-management SaaS had many paid accounts that downgraded to the free plan and stopped logging in.",
        analysis: "Exit survey and usage data showed two groups: teams that had finished a project (low intent) and teams that left during a painful migration to a new interface (high intent, fixable reason).",
        outcome: "The second group received a personal outreach from customer success with a guided session on the new interface. Reactivation was several times higher than for the generic 'we miss you' email used before.",
      },
    ],
    visuals: [
      {
        type: "line",
        title: "Reactivation probability by months since last purchase",
        caption: "Notice how quickly the chance of return falls: acting in the first few months of dormancy is worth far more than acting late.",
        xLabels: ["1", "3", "6", "9", "12", "18"],
        yLabel: "Reactivation rate (%)",
        series: [
          { name: "High previous value", points: [28, 18, 11, 7, 5, 3] },
          { name: "Low previous value", points: [14, 8, 4, 3, 2, 1] },
        ],
      },
      {
        type: "matrix",
        title: "Winback prioritisation grid",
        caption: "Spend most where both previous value and intent are high; low-value, low-intent customers rarely justify an incentive.",
        xLabel: "Intent to return",
        yLabel: "Previous value",
        quadrants: ["Invest: stronger offer or personal outreach", "Priority: reminder or fix the issue", "Leave or low-cost touch", "Nudge: light, low-cost prompt"],
        points: [
          { label: "Lapsed VIPs who still browse", x: 80, y: 85 },
          { label: "Lapsed VIPs, silent", x: 25, y: 80 },
          { label: "One-off buyers, browsing", x: 70, y: 25 },
          { label: "One-off buyers, silent", x: 15, y: 15 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Reactivation rate", formula: "Lapsed customers who purchase again ÷ lapsed customers targeted", meaning: "Raw share of the targeted group that comes back in the measurement window." },
      { name: "Incremental reactivation", formula: "Reactivation rate (treated) − reactivation rate (control)", meaning: "The share of returns actually caused by the campaign." },
      { name: "Cost per incremental reactivation", formula: "Campaign cost incl. discounts ÷ incremental reactivated customers", meaning: "What it really costs to bring one customer back; compare with acquisition cost." },
      { name: "Post-reactivation retention", formula: "Reactivated customers still active after N months ÷ reactivated customers", meaning: "Whether winback creates lasting customers or one discounted purchase." },
    ],
    pitfalls: [
      "Reporting gross reactivation without a control group, which credits the campaign with customers who would have returned anyway.",
      "Defaulting to deep discounts, which trains customers to lapse in order to receive offers.",
      "Using one dormancy window for all products or segments regardless of their natural purchase cycle.",
      "Ignoring the reason customers left, so the winback message does not address the actual problem.",
      "Measuring only the first repeat purchase rather than whether reactivated customers stay.",
    ],
    related: ["churn", "rfm", "experimentation", "lifecycle"],
  },

  /* ------------------------------------------------------------------ */
  "loyalty-tiering": {
    overview: [
      "A loyalty and tiering assessment evaluates whether a loyalty programme actually changes the behaviour of valuable customers, or whether it simply rewards people for what they would have done anyway. It looks at membership, tier structure, earning and burning of rewards, and how customers move between tiers.",
      "Tiered programmes, popularised by airline frequent flyer schemes from the early 1980s, rely on two mechanisms: rewards that customers accumulate (points) and status that customers want to reach or keep (tiers). Both only create value if they shift spending, frequency or retention among the customers that matter.",
      "The assessment answers: does the programme change behaviour for valuable customers, are the tier thresholds and benefits set in the right places, and is the cost of rewards justified by the incremental value created?",
    ],
    whenToUse: [
      "The programme's cost (points liability, benefits, operations) is growing and finance is asking for its return.",
      "Most members sit in the base tier and rarely move up, or upper tiers are crowded and no longer feel special.",
      "Members do not seem to behave differently from non-members once you account for who joins.",
      "Redemption rates are very low, suggesting members do not value or understand the rewards.",
      "A competitor has launched a richer programme and you need to decide whether to respond.",
    ],
    howItWorks: [
      {
        step: "Compare members with comparable non-members",
        detail: "Members are usually better customers before they join, so a raw comparison overstates the programme's effect. Match members to non-members with similar pre-join spend and frequency, or compare members' behaviour before and after joining, to estimate the true lift.",
      },
      {
        step: "Analyse tier distribution and migration",
        detail: "Build a tier migration matrix showing where members in each tier were 12 months earlier. Healthy programmes show meaningful upward movement and a retained top tier; unhealthy ones show most members stuck at the bottom or a steady leak from upper tiers.",
      },
      {
        step: "Look for behaviour near thresholds",
        detail: "Check whether spending or activity rises as customers approach a tier threshold or the end of a qualifying year. A visible acceleration means the status goal is motivating; no change means the threshold is too far away or not visible enough.",
      },
      {
        step: "Assess earn and burn",
        detail: "Measure how many members earn, how many redeem, how long points sit before use and the share that expire. Low redemption often means rewards feel unreachable or unattractive, which weakens the programme's pull.",
      },
      {
        step: "Assess benefit perception and cost",
        detail: "Survey or interview members about which benefits they value, and compare with what each benefit costs. Often a few low-cost benefits (recognition, priority service) are valued highly while expensive ones go unnoticed.",
      },
      {
        step: "Recommend structural changes and test them",
        detail: "Adjust thresholds, introduce soft-landing rules, rebalance benefits or add accelerators for target segments. Pilot changes with a test and control group before rolling out, since programme changes are hard to reverse.",
      },
    ],
    plainWords:
      "Think of a coffee shop stamp card: buy nine coffees and the tenth is free. It only helps the shop if people come in more often because of the card. If the card goes to people who already come every day, the shop is just giving away free coffee. A good loyalty programme is like a ladder with steps close enough that people want to climb to the next one, and prizes that people actually care about.",
    examples: [
      {
        title: "Supermarket loyalty card",
        situation: "A grocery chain's card had 6 million members and members spent twice as much as non-members, which management cited as proof the programme worked.",
        analysis: "Matching on pre-join spend showed most of the gap existed before customers joined. The real lift was about 6% in visit frequency, concentrated among mid-spend families who responded to personalised fresh-food offers; heavy spenders showed almost no change.",
        outcome: "The chain shifted reward budget from generic points towards targeted offers for mid-spend households. Illustratively, programme cost fell by 15% while incremental sales held steady.",
      },
      {
        title: "Airline status tiers",
        situation: "An airline found 70% of its top-tier members had qualified only through a promotional double-tier-points campaign two years earlier, and lounges were overcrowded.",
        analysis: "Migration analysis showed a large share of top-tier members would drop a tier at the next review, and near-threshold behaviour showed little effort to retain status.",
        outcome: "The airline introduced a revenue-based qualification element and a soft landing (drop one tier at a time), which restored exclusivity at the top while protecting loyalty among genuinely high-value flyers.",
      },
      {
        title: "Beauty e-commerce",
        situation: "An online beauty retailer had a points programme in which only 12% of members had ever redeemed.",
        analysis: "Interviews showed the first reward required a spend that typical members reached only after 14 months. Members did not see it as achievable.",
        outcome: "Adding a low first reward after the second order and a birthday gift raised redemption and, in a controlled pilot, increased second-order rate among new members.",
      },
    ],
    visuals: [
      {
        type: "bars",
        title: "Incremental annual spend lift by member segment",
        caption: "The programme moves mid-spend members most; top spenders would have spent similarly without it.",
        unit: "%",
        items: [
          { label: "Light spenders", value: 3 },
          { label: "Mid spenders", value: 11, highlight: true },
          { label: "Heavy spenders", value: 2 },
          { label: "Lapsing members", value: 7 },
        ],
      },
      {
        type: "funnel",
        title: "From member to engaged member",
        caption: "Most members never reach the stage where the programme can change their behaviour.",
        stages: [
          { label: "Enrolled", value: 100 },
          { label: "Earned in last 12 months", value: 62 },
          { label: "Ever redeemed", value: 24 },
          { label: "Moved up a tier", value: 9 },
          { label: "Retained upper tier", value: 6 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Incremental spend per member", formula: "Member spend − matched non-member (or pre-join) spend", meaning: "The behaviour change attributable to the programme rather than to self-selection." },
      { name: "Active member rate", formula: "Members earning or redeeming in period ÷ total members", meaning: "How much of the base the programme actually touches." },
      { name: "Redemption rate", formula: "Points redeemed ÷ points issued", meaning: "Whether rewards are attainable and valued; very low rates weaken motivation." },
      { name: "Tier upgrade and retention rates", formula: "Members moving up (or holding) a tier ÷ members eligible", meaning: "Whether the status ladder motivates progression and keeps top customers." },
      { name: "Programme ROI", formula: "(Incremental margin − programme cost) ÷ programme cost", meaning: "Whether the programme pays for itself." },
    ],
    pitfalls: [
      "Comparing members with non-members without adjusting for the fact that better customers join first.",
      "Setting thresholds so high that most members never feel close to the next tier.",
      "Treating points liability as a pure cost rather than also tracking breakage and its effect on perception.",
      "Adding expensive benefits nobody asked for while neglecting low-cost recognition benefits.",
      "Changing tier rules abruptly, which damages trust among the most loyal customers.",
    ],
    related: ["rfm", "clv", "frequency", "churn"],
  },

  /* ------------------------------------------------------------------ */
  "next-best-action": {
    overview: [
      "Next-best-action (NBA) is an approach to personalisation in which, for every customer and moment, a decisioning system chooses the single most valuable thing to do: an offer, a piece of content, a service message, or nothing at all. It replaces the campaign-centric view (which customers should get this campaign?) with a customer-centric one (what should this customer get now?).",
      "An NBA framework combines four ingredients: eligibility rules (what a customer can receive), propensity (how likely they are to respond), value (what a response is worth to both customer and business) and context (channel, timing, recent behaviour). An arbitration step ranks the eligible actions and applies business rules such as contact limits.",
      "The assessment answers: are we making the right offer to the right customer at the right moment, and does our decisioning generate more value than simpler rules or no personalisation at all?",
    ],
    whenToUse: [
      "Different teams send competing offers to the same customer and nobody arbitrates between them.",
      "Personalisation exists but is limited to inserting a first name or broad segment content.",
      "Cross-sell and upsell rates are low despite rich product holding and behavioural data.",
      "Customers complain about irrelevant offers, for example being offered a product they already hold.",
      "Leadership wants to know whether investment in a decisioning engine is paying back.",
    ],
    howItWorks: [
      {
        step: "Audit current decisioning",
        detail: "Map how offers are chosen today across channels: who decides, using what data, with what rules and how often. Look for conflicts, gaps and places where the same customer receives contradictory messages.",
      },
      {
        step: "Define the action library and eligibility",
        detail: "List every action that could be shown, including service and retention actions, not only sales offers. For each, define eligibility rules such as product holdings, credit or risk criteria, consent and recent contact history.",
      },
      {
        step: "Estimate propensity and value",
        detail: "Build or reuse models that estimate each customer's likelihood to respond to each action, and attach a value (margin, lifetime value impact or a strategic weight). Expected value is roughly propensity × value, adjusted for cost and customer benefit.",
      },
      {
        step: "Arbitrate across actions",
        detail: "Rank eligible actions by expected value, then apply business rules: contact caps, priority for service issues, suppression after a complaint and diversity so the same offer is not repeated. The output is one or a few actions per customer per channel.",
      },
      {
        step: "Deliver in context",
        detail: "Push the chosen action into the channels where the customer is active, such as app, web, email or contact centre, with consistent content. Real-time triggers (a login, a page view, a balance change) often matter more than batch scores.",
      },
      {
        step: "Test against control and learn",
        detail: "Keep a random control that receives either no personalisation or the previous rules. Compare incremental response and value, and feed outcomes back into the propensity models so the system improves over time.",
      },
    ],
    plainWords:
      "Think of a good waiter at your favourite café. They notice you already have a drink, so they don't offer you another one; they see you have finished your main course, so they suggest dessert; and if you look in a hurry, they just bring the bill. Next-best-action is trying to be that waiter for every customer, choosing the one most helpful thing to say right now instead of reading out the whole menu.",
    examples: [
      {
        title: "Retail bank",
        situation: "A bank's product teams each ran their own campaigns, so a customer could receive a credit card offer, a loan offer and a savings offer in the same week, while some customers in financial difficulty still received credit offers.",
        analysis: "An audit found no central arbitration and eligibility rules applied inconsistently by channel. Propensity models existed for cards and loans but not for service actions.",
        outcome: "The bank introduced a central NBA layer with service and wellbeing actions prioritised over sales for customers with stress signals. In this illustration, offer acceptance rose from 1.8% to 3.1% against a control, while total offers sent fell by a third.",
      },
      {
        title: "Telecom operator",
        situation: "A mobile operator wanted to increase data add-on sales but customers complained about pushy upgrade messages.",
        analysis: "Usage data showed the best moment was when a customer reached 80% of their data allowance, and that customers likely to churn responded better to a loyalty benefit than to an upsell.",
        outcome: "Triggered, context-aware actions replaced a monthly batch campaign; add-on revenue rose and complaint volumes about marketing fell.",
      },
      {
        title: "E-commerce marketplace",
        situation: "A marketplace's home page showed the same promotional banners to all visitors.",
        analysis: "Testing personalised product recommendations and category banners based on recent browsing against the static page showed strong lift for returning visitors and little for first-time visitors with no history.",
        outcome: "Personalisation was focused on returning visitors, while first-time visitors received curated best-sellers, which kept the decisioning simpler without losing value.",
      },
    ],
    visuals: [
      {
        type: "cycle",
        title: "The next-best-action loop",
        caption: "Each response feeds back into the next decision, which is what makes NBA improve over time.",
        steps: ["Collect profile and context", "Check eligibility", "Score propensity × value", "Arbitrate and apply rules", "Deliver in channel", "Capture response and learn"],
      },
      {
        type: "bars",
        title: "Incremental conversion vs control by decisioning approach",
        caption: "Moving from mass campaigns to arbitrated, context-aware actions typically delivers the largest step change.",
        unit: "pts",
        items: [
          { label: "Mass campaign", value: 0.3 },
          { label: "Segment rules", value: 0.8 },
          { label: "Propensity per product", value: 1.2 },
          { label: "Arbitrated NBA", value: 1.9, highlight: true },
        ],
      },
    ],
    keyMetrics: [
      { name: "Expected value of an action", formula: "Propensity × value − cost of action", meaning: "The ranking basis used to choose between eligible actions." },
      { name: "Incremental response rate", formula: "Response rate (NBA) − response rate (control)", meaning: "The lift the decisioning creates over the baseline approach." },
      { name: "Incremental value per customer", formula: "(Value per treated customer − value per control customer)", meaning: "The financial return of personalisation, including effects across products." },
      { name: "Offer coverage", formula: "Customers with at least one eligible, relevant action ÷ total customers", meaning: "How much of the base the action library can serve." },
    ],
    pitfalls: [
      "Ranking only by propensity, which favours easy, low-value offers over valuable ones.",
      "Leaving service, retention and do-nothing actions out of the library so every customer receives a sales message.",
      "Running NBA without a control group, making it impossible to prove incremental value.",
      "Using stale batch data when the decision depends on what the customer did minutes ago.",
      "Letting individual product teams bypass arbitration with their own campaigns.",
    ],
    related: ["experimentation", "martech-capability", "contactability", "clv"],
  },

  /* ------------------------------------------------------------------ */
  contactability: {
    overview: [
      "CRM contactability and frequency analysis looks at two linked questions: how many customers can we actually reach in owned channels, and are we contacting them too much or too little? It covers consent, data quality, deliverability, suppression and the relationship between contact frequency and engagement.",
      "The underlying idea is that the CRM base behaves like a reservoir. Consent and valid contact data fill it; unsubscribes, bounces and dormancy drain it. Sending more messages can raise short-term response but accelerates the drain through fatigue and opt-outs, so frequency has to be managed rather than maximised.",
      "The framework answers: can we reach customers, and are we over- or under-communicating? It usually ends with contact caps, a preference centre, and a plan to grow the reachable base.",
    ],
    whenToUse: [
      "Email or push unsubscribe rates are rising, or open and click rates are falling month after month.",
      "Only a small share of customers have valid consent and contact details for marketing channels.",
      "Several teams send messages independently and nobody knows how many a customer receives per week.",
      "Deliverability problems, such as messages landing in spam folders, have appeared.",
      "The business wants to rely more on owned channels as paid media costs rise.",
    ],
    howItWorks: [
      {
        step: "Measure the contactable base",
        detail: "Start with all active customers and step down through valid email or phone, marketing consent, not suppressed, deliverable and recently engaged. The result shows how much of the base is truly reachable in each channel and where the biggest losses occur.",
      },
      {
        step: "Audit consent and data capture",
        detail: "Review where and how consent is collected (checkout, account creation, app onboarding) and the capture rate at each point. Check that consent records are stored centrally and respected across all sending tools.",
      },
      {
        step: "Analyse frequency vs engagement",
        detail: "Group customers by how many messages they received per week or month, and compare opens, clicks, conversions and unsubscribes. Typically response per message falls and unsubscribes rise beyond a certain frequency, though the point differs by segment.",
      },
      {
        step: "Estimate the cost of fatigue",
        detail: "Value lost subscribers using the revenue a reachable customer generates over time. This puts unsubscribes and complaints on the same financial footing as campaign revenue, so teams can see when an extra send destroys more value than it creates.",
      },
      {
        step: "Define caps, priorities and preferences",
        detail: "Set channel and total contact caps by segment, a priority order when messages compete, and quiet periods after purchases or complaints. Offer a preference centre so customers can choose topics and frequency instead of leaving entirely.",
      },
      {
        step: "Monitor deliverability and base health",
        detail: "Track bounce, complaint and inbox placement rates alongside the size of the reachable base. Remove or re-permission long-term non-openers to protect sender reputation.",
      },
    ],
    plainWords:
      "Think of the CRM list as a bucket of water. New customers who say 'yes, you can message me' pour water in; people who unsubscribe or whose addresses stop working are holes in the bottom. If you shout at people too often, the holes get bigger. The aim is to keep the bucket full and only speak up when you have something useful to say.",
    examples: [
      {
        title: "Fashion e-commerce",
        situation: "An online retailer sent daily promotional emails to its whole list and saw revenue per email declining while unsubscribes climbed.",
        analysis: "Frequency analysis showed customers receiving 5+ emails a week unsubscribed at four times the rate of those receiving 2–3, with only marginally more purchases. Low-engagement customers drove most of the complaints.",
        outcome: "The retailer capped sends at three per week for low-engagement customers and introduced a preference centre. Illustratively, total email revenue fell slightly in the first month but the reachable base stopped shrinking and revenue recovered within a quarter.",
      },
      {
        title: "Quick-service restaurant app",
        situation: "A QSR chain relied on push notifications but only 35% of app users had push enabled.",
        analysis: "The permission prompt appeared on first launch, before users had seen any value. Users who saw it after their first order accepted at a much higher rate.",
        outcome: "Moving the prompt to after the first order, with a clear explanation of what notifications would contain, raised push opt-in substantially in a test.",
      },
      {
        title: "Utility provider",
        situation: "A utility wanted to promote energy-saving products but discovered only 40% of customers had marketing consent.",
        analysis: "Consent was only captured at sign-up with a pre-ticked opt-out flow later removed for compliance; existing customers had never been asked again.",
        outcome: "A value-led re-permission campaign attached to useful service messages (usage insights) grew the consented base without breaching regulation.",
      },
    ],
    visuals: [
      {
        type: "funnel",
        title: "From customer base to reachable audience",
        caption: "The largest loss is often consent, not data quality, which points to where to invest first.",
        stages: [
          { label: "Active customers", value: 1000 },
          { label: "Valid email held", value: 820 },
          { label: "Marketing consent", value: 520 },
          { label: "Not suppressed or bounced", value: 470 },
          { label: "Engaged in last 90 days", value: 290 },
        ],
      },
      {
        type: "line",
        title: "Engagement and unsubscribes by weekly send frequency",
        caption: "Clicks per customer flatten after three sends a week while unsubscribes keep rising.",
        xLabels: ["1", "2", "3", "4", "5", "6+"],
        yLabel: "Rate (%)",
        series: [
          { name: "Weekly click rate per customer", points: [4.0, 6.5, 7.8, 8.2, 8.3, 8.3] },
          { name: "Monthly unsubscribe rate", points: [0.2, 0.3, 0.5, 0.9, 1.4, 2.1] },
        ],
      },
    ],
    keyMetrics: [
      { name: "Contactable rate", formula: "Customers reachable with consent and valid data ÷ active customers", meaning: "How much of the base owned channels can actually reach." },
      { name: "Unsubscribe rate", formula: "Unsubscribes ÷ messages delivered", meaning: "A leading indicator of fatigue and irrelevance." },
      { name: "Revenue per contactable customer", formula: "CRM-attributed revenue ÷ contactable customers", meaning: "The value of keeping a customer reachable; used to cost fatigue." },
      { name: "Net base growth", formula: "New consents − (unsubscribes + hard bounces + suppressions)", meaning: "Whether the reachable base is growing or draining." },
      { name: "Contacts per customer per week", meaning: "The actual pressure each customer experiences across all teams and channels." },
    ],
    pitfalls: [
      "Judging each campaign on its own revenue while ignoring the unsubscribes it causes.",
      "Applying a single frequency cap to all customers regardless of engagement.",
      "Letting consent records differ between systems so suppressed customers are still contacted.",
      "Keeping years of non-openers on the list, which harms deliverability for everyone.",
      "Offering only all-or-nothing unsubscribe instead of a preference centre.",
    ],
    related: ["engagement-decay", "data-governance", "next-best-action", "lifecycle"],
  },

  /* ------------------------------------------------------------------ */
  "martech-capability": {
    overview: [
      "A MarTech capability assessment evaluates whether the marketing technology stack can deliver the use cases the business needs. Instead of starting from tools, it starts from use cases (for example 'trigger an abandoned-basket message within an hour across email and app') and works back to the capabilities required: data, identity, decisioning, activation and measurement.",
      "The idea is that tools are means, not ends. Many organisations own powerful platforms that are under-used because integrations, data or skills are missing. Scoring capabilities against a maturity scale reveals the specific gaps that block value, rather than prompting a wholesale replacement.",
      "The assessment answers: which capability gaps block the required use cases, how severe are they, and in what order should they be closed?",
    ],
    whenToUse: [
      "The business is considering buying a CDP, CRM or personalisation platform and needs to justify it.",
      "Marketers depend on manual data extracts and spreadsheets to run campaigns.",
      "Personalisation or triggered journeys are planned but repeatedly delayed by technical constraints.",
      "The stack has grown by accretion and nobody has a clear picture of what each tool does.",
      "Licence costs are rising without visible improvement in marketing outcomes.",
    ],
    howItWorks: [
      {
        step: "List and prioritise use cases",
        detail: "Collect the marketing use cases the business wants, written concretely with trigger, audience, channel and timing. Estimate the value and urgency of each so the assessment focuses on what matters.",
      },
      {
        step: "Map required capabilities",
        detail: "For each use case, identify the capabilities it needs across layers: data collection, identity resolution, profile and segmentation, decisioning, content, channel activation, consent and measurement. Many use cases share capabilities, which reveals foundational gaps.",
      },
      {
        step: "Score current maturity",
        detail: "Rate each capability on a simple scale (for example 1 = absent or manual, 3 = available but batch or partial, 5 = automated, real-time and governed). Base scores on evidence such as integration diagrams, data latency and how campaigns are actually run, not vendor feature lists.",
      },
      {
        step: "Identify gaps and root causes",
        detail: "Compare required versus current maturity for each capability. Distinguish whether gaps are caused by technology, data, process or skills, because many 'tool problems' are actually missing integrations or owners.",
      },
      {
        step: "Build the roadmap",
        detail: "Sequence fixes so that foundational capabilities (identity, consent, data feeds) come before advanced ones (real-time decisioning). Tie each investment to the use cases it unlocks and their value.",
      },
    ],
    plainWords:
      "Imagine a football team that wants to play fast passing football. Before buying new boots, the coach checks: can the players pass accurately, do they talk to each other, does anyone know the tactics? Often the problem isn't the boots but the passing practice. A MarTech assessment does the same: start with how you want to play, then check which skills and kit are actually missing.",
    examples: [
      {
        title: "Multi-brand retailer",
        situation: "A retailer planned to buy a new CDP because it could not personalise emails.",
        analysis: "Use-case mapping showed the existing email platform could personalise, but product and transaction data arrived only weekly and customer IDs were not matched between online and store. The gap was identity and data latency, not the email tool.",
        outcome: "The retailer invested first in a daily data feed and identity matching. In this illustration, eight of the twelve priority use cases became possible without buying a new platform.",
      },
      {
        title: "Insurance provider",
        situation: "An insurer wanted renewal reminders triggered by quote abandonment on the website, but campaigns took two weeks to set up.",
        analysis: "Scoring showed strong data but low maturity in activation and orchestration: every journey required IT tickets and manual list uploads.",
        outcome: "Introducing a journey orchestration tool with self-service audiences for marketers cut campaign set-up time from weeks to days.",
      },
      {
        title: "B2B SaaS",
        situation: "A SaaS company's marketing and sales teams disagreed on lead quality and attribution.",
        analysis: "Assessment found product usage data never reached the CRM, so neither lead scoring nor attribution could use the strongest buying signal.",
        outcome: "Connecting product events to the CRM became the top roadmap item, unlocking product-qualified leads and better reporting.",
      },
    ],
    visuals: [
      {
        type: "bars",
        title: "Capability gap: required minus current maturity",
        caption: "Identity resolution and data latency show the largest gaps, so they block the most use cases.",
        unit: "pts",
        items: [
          { label: "Data collection", value: 1 },
          { label: "Identity resolution", value: 3, highlight: true },
          { label: "Data latency", value: 3, highlight: true },
          { label: "Segmentation", value: 1 },
          { label: "Decisioning", value: 2 },
          { label: "Activation", value: 2 },
          { label: "Measurement", value: 2 },
        ],
      },
      {
        type: "matrix",
        title: "Use-case prioritisation",
        caption: "Start with valuable use cases that current capability can already support, while closing gaps for the high-value, hard ones.",
        xLabel: "Feasibility with current stack",
        yLabel: "Business value",
        quadrants: ["Strategic: close gaps first", "Quick wins: do now", "Deprioritise", "Fill-ins: when capacity allows"],
        points: [
          { label: "Real-time NBA", x: 20, y: 85 },
          { label: "Abandoned basket", x: 80, y: 75 },
          { label: "Birthday email", x: 85, y: 25 },
          { label: "Cross-device journeys", x: 25, y: 35 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Capability gap score", formula: "Required maturity − current maturity, per capability", meaning: "Where the stack falls short of what priority use cases need." },
      { name: "Use-case coverage", formula: "Use cases deliverable today ÷ priority use cases", meaning: "How much of the desired marketing the stack can currently support." },
      { name: "Data latency", meaning: "Time from customer action to availability for targeting; drives which triggered use cases are possible." },
      { name: "Time to launch", meaning: "Days from campaign idea to live, a practical indicator of operational maturity." },
      { name: "Licence utilisation", formula: "Features or seats actively used ÷ features or seats paid for", meaning: "Whether existing investment is being used before adding more." },
    ],
    pitfalls: [
      "Starting from vendor demos rather than the business's own use cases.",
      "Assuming a new platform will fix gaps that are really caused by data quality, process or skills.",
      "Scoring maturity from what tools could do instead of what the team actually does.",
      "Planning advanced use cases before identity and consent foundations are in place.",
      "Ignoring the operating model: owners, governance and training.",
    ],
    related: ["use-case-roadmap", "data-governance", "next-best-action", "signal-loss"],
  },

  /* ------------------------------------------------------------------ */
  experimentation: {
    overview: [
      "Experimentation and incrementality measurement estimates the true causal effect of marketing by comparing a group that receives an intervention with an otherwise identical group that does not. The difference in outcomes is the incremental effect: the results that would not have happened without the activity.",
      "The approach comes from randomised controlled trials in medicine and statistics, adopted widely in digital marketing as A/B testing. Its strength is that random assignment balances everything else, known and unknown, so the only systematic difference between groups is the treatment.",
      "The framework answers: what is the true incremental effect of our marketing, and is it large enough, and certain enough, to act on? It also guards against attribution reports that credit marketing for sales that would have happened anyway.",
    ],
    whenToUse: [
      "Attribution reports show strong returns for a channel, but nobody knows whether those customers would have bought anyway.",
      "CRM campaigns are judged on response rates without a holdout group.",
      "Teams debate design or copy changes based on opinion rather than evidence.",
      "Budget decisions depend on whether a channel such as brand search or retargeting is incremental.",
      "A new personalisation or pricing approach needs proof before full rollout.",
    ],
    howItWorks: [
      {
        step: "Define a hypothesis and primary metric",
        detail: "State what you will change, for whom and what you expect to happen, for example 'adding delivery dates on product pages will increase conversion by at least 3%'. Choose one primary metric in advance and a few guardrail metrics that must not get worse.",
      },
      {
        step: "Size the sample",
        detail: "Use a power calculation based on the baseline rate, the minimum effect you care about, and the confidence you need. Small effects on low baseline rates require large samples; if you cannot reach them, test a bolder change or a higher-frequency metric.",
      },
      {
        step: "Randomise assignment",
        detail: "Allocate users, customers or regions to test and control at random, and log every assignment. Choose the unit carefully: if customers see both versions across devices, or regions share media, results can be contaminated.",
      },
      {
        step: "Run for the planned duration",
        detail: "Let the test run for the pre-planned length, covering full weekly cycles. Avoid stopping as soon as results look significant, which inflates false positives, unless you use a method designed for sequential testing.",
      },
      {
        step: "Measure lift and uncertainty",
        detail: "Calculate the difference between test and control with a confidence interval, not just a p-value. Check guardrails and segment results cautiously, since slicing data many ways will produce chance findings.",
      },
      {
        step: "Decide and document",
        detail: "Roll out, iterate or stop based on the size and certainty of the effect relative to cost. Record the result in a shared log so the organisation builds knowledge rather than repeating tests.",
      },
    ],
    plainWords:
      "Suppose you want to know if a new sign makes more people buy from your lemonade stand. If you put it up on a hot day, you can't tell whether the sign or the weather did the work. So you split the days fairly by coin toss: sign on some days, no sign on others. The difference in sales between the two kinds of day is what the sign really did.",
    examples: [
      {
        title: "Retargeting display campaign",
        situation: "An online travel agency's attribution tool credited retargeting with a high return on ad spend.",
        analysis: "A ghost-ad holdout, where a random 15% of eligible users were withheld from seeing ads, showed the exposed group converted only slightly more than the holdout. Most attributed bookings would have happened anyway.",
        outcome: "Illustratively, the measured incremental return was about a fifth of the attributed figure. Budget was cut and partly redirected to prospecting, which a later geo test showed to be more incremental.",
      },
      {
        title: "Bank CRM campaign",
        situation: "A bank reported a 5% response rate to a savings account email.",
        analysis: "A 10% random holdout opened accounts at 4.2% without the email, so the incremental response was only 0.8 points.",
        outcome: "The bank redirected the campaign to customers with a recent large deposit, where the incremental effect was much higher, and made holdouts standard on all campaigns.",
      },
      {
        title: "Grocery delivery checkout",
        situation: "A grocery delivery app wanted to show delivery slots earlier in the checkout.",
        analysis: "An A/B test sized to detect a 2% relative lift ran for three weeks. Conversion rose 3.1% with a confidence interval of 1.4% to 4.8%, and average order value was unchanged.",
        outcome: "The change was rolled out and recorded in the experiment log along with the effect size.",
      },
    ],
    visuals: [
      {
        type: "bars",
        title: "Attributed vs incremental conversions",
        caption: "Attribution counts every conversion touched by the channel; a holdout shows how many were actually caused by it.",
        unit: "conversions",
        items: [
          { label: "Attributed (last click)", value: 1000 },
          { label: "Would have converted anyway", value: 780 },
          { label: "Incremental", value: 220, highlight: true },
        ],
      },
      {
        type: "cycle",
        title: "The experimentation loop",
        caption: "Each test should end with a decision and a recorded learning that shapes the next hypothesis.",
        steps: ["Hypothesis", "Sample size and design", "Randomise", "Run full duration", "Measure lift and confidence", "Decide and record"],
      },
    ],
    keyMetrics: [
      { name: "Absolute lift", formula: "Rate (test) − rate (control)", meaning: "Extra conversions per person exposed caused by the change." },
      { name: "Relative lift", formula: "(Rate (test) − rate (control)) ÷ rate (control)", meaning: "Size of the effect relative to baseline." },
      { name: "Incremental ROI", formula: "(Incremental margin − cost) ÷ cost", meaning: "Return based only on outcomes caused by the activity." },
      { name: "Minimum detectable effect", meaning: "The smallest lift a test can reliably detect given sample size and baseline; set it before running." },
      { name: "Confidence interval", meaning: "The plausible range for the true effect; a wide interval means the result is uncertain." },
    ],
    pitfalls: [
      "Stopping a test early as soon as the result looks significant.",
      "Running underpowered tests and concluding 'no effect' when the test simply could not detect one.",
      "Analysing many segments and metrics after the fact and reporting whichever looks best.",
      "Contaminated control groups, for example customers who are held out of email but still see the same offer elsewhere.",
      "Treating attributed conversions as incremental without any control.",
    ],
    related: ["attribution", "mmm", "creative-testing", "next-best-action"],
  },

  /* ------------------------------------------------------------------ */
  "ux-diagnosis": {
    overview: [
      "UX and technical performance diagnosis investigates whether a change in conversion or engagement was caused by the product itself, such as a website redesign, an app release, a bug, slower pages or a broken checkout step, rather than by marketing or demand. It is detective work that lines up metric changes with what changed in the product.",
      "The principle is that technical issues tend to leave fingerprints: they start at a specific time, affect particular devices, browsers, pages or steps, and show up in error logs and session recordings. Marketing or demand changes usually look different, affecting traffic volume or all segments evenly.",
      "The framework answers: did a product or technical change cause the drop, where exactly is the friction, and how much is it costing?",
    ],
    whenToUse: [
      "Conversion rate fell suddenly while traffic and its mix stayed broadly stable.",
      "A redesign, platform migration or app release went live shortly before performance declined.",
      "One device, browser or operating system shows much worse conversion than others.",
      "Page load times or error rates have increased.",
      "Customer service is hearing complaints about not being able to complete purchases or log in.",
    ],
    howItWorks: [
      {
        step: "Pinpoint when the change started",
        detail: "Plot daily or hourly conversion and step-level funnel rates and identify the exact start of the change. A sharp step suggests a release or bug; a gradual decline points more to demand, competition or creeping performance problems.",
      },
      {
        step: "Align with the release and change log",
        detail: "Overlay deployments, tag changes, third-party script updates, pricing changes and campaign launches on the timeline. Ask engineering for releases that might not be in the marketing calendar, such as a payment provider update.",
      },
      {
        step: "Break down by device, browser and step",
        detail: "Compare the funnel by device type, browser, operating system, app version, country and page template. A drop limited to one segment, such as Safari on iOS at the payment step, is strong evidence of a technical cause.",
      },
      {
        step: "Check performance and errors",
        detail: "Review page speed and responsiveness metrics, JavaScript and server error rates and failed API calls for the affected pages. Slower pages and new errors that coincide with the drop narrow the cause further.",
      },
      {
        step: "Review session evidence",
        detail: "Watch session recordings, heatmaps and form analytics for affected users to see where they hesitate, rage-click or abandon. Combine with customer service contacts and on-site feedback.",
      },
      {
        step: "Quantify impact and confirm the fix",
        detail: "Estimate lost conversions by comparing the affected segment with its pre-change baseline or with unaffected segments. After a fix, confirm recovery; where possible validate with an A/B test or a rollback.",
      },
    ],
    plainWords:
      "Imagine the canteen queue at work suddenly moves much slower. Before blaming the cooks, you check what changed: maybe the till was replaced on Monday, and it only jams when people pay by card. UX diagnosis is the same: find when the problem began, what changed at that moment, and who exactly is stuck.",
    examples: [
      {
        title: "Fashion e-commerce redesign",
        situation: "Two weeks after a new checkout went live, an online retailer's conversion rate fell from 2.8% to 2.3%, while traffic was stable.",
        analysis: "Step-level analysis showed the fall was concentrated at the address step on mobile. Session recordings revealed the new address lookup failed for postcodes with certain formats, and form analytics showed many users abandoning at that field.",
        outcome: "Adding a manual entry fallback restored mobile completion. In this illustration, the issue had cost around 1,800 orders before the fix.",
      },
      {
        title: "Banking app release",
        situation: "A bank's app login success rate dropped after a release, and app store ratings fell.",
        analysis: "Breakdown by OS version showed the problem affected only older Android versions where a new biometric library crashed.",
        outcome: "A hotfix reverted the library for affected versions, and the team added older devices to the release test plan.",
      },
      {
        title: "Travel site page speed",
        situation: "A hotel booking site saw a gradual decline in conversion over three months.",
        analysis: "No single release coincided, but page load times had crept up as marketing tags and third-party scripts were added. Slower sessions converted markedly less.",
        outcome: "A tag audit removed unused scripts and deferred others, bringing load time down and conversion back towards its earlier level.",
      },
    ],
    visuals: [
      {
        type: "line",
        title: "Conversion by device around a release",
        caption: "Mobile drops sharply in week 4 when the release went live while desktop stays flat, pointing to a device-specific fault.",
        xLabels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"],
        yLabel: "Conversion rate (%)",
        series: [
          { name: "Desktop", points: [3.4, 3.5, 3.4, 3.4, 3.5, 3.4] },
          { name: "Mobile", points: [2.2, 2.3, 2.2, 1.6, 1.5, 2.2] },
        ],
      },
      {
        type: "funnel",
        title: "Mobile checkout after the release",
        caption: "The unusual drop between address and payment locates the friction precisely.",
        stages: [
          { label: "Basket", value: 1000 },
          { label: "Checkout start", value: 640 },
          { label: "Address entered", value: 380 },
          { label: "Payment", value: 330 },
          { label: "Order", value: 290 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Step conversion rate", formula: "Users completing step ÷ users reaching step", meaning: "Locates where friction occurs in a funnel." },
      { name: "Conversion by segment vs baseline", formula: "Current rate ÷ pre-change rate, by device or browser", meaning: "Shows whether a drop is concentrated in one technical segment." },
      { name: "Page load and responsiveness", meaning: "Speed metrics such as largest contentful paint and interaction delay; slower experiences tend to convert less." },
      { name: "Error rate", formula: "Sessions with errors ÷ total sessions", meaning: "Detects bugs and failing integrations." },
      { name: "Estimated lost conversions", formula: "(Baseline rate − current rate) × affected sessions", meaning: "Sizes the commercial impact to prioritise fixes." },
    ],
    pitfalls: [
      "Blaming marketing or seasonality without first checking the release log.",
      "Looking only at the overall conversion rate, which hides problems in a single device or step.",
      "Mistaking a change in traffic mix (for example more low-intent visitors) for a UX problem.",
      "Forgetting tracking changes: a broken tag can make conversion look lower when sales are unchanged.",
      "Fixing the symptom without adding regression checks, so the issue recurs in the next release.",
    ],
    related: ["funnel", "signal-loss", "experimentation", "activation"],
  },

  /* ------------------------------------------------------------------ */
  aarrr: {
    overview: [
      "AARRR, often called pirate metrics because the acronym sounds like a pirate's 'Arrr', was introduced by Dave McClure in 2007 as a simple model for start-up growth. It breaks the customer journey into five stages: Acquisition, Activation, Retention, Referral and Revenue.",
      "Each stage has one clear metric, and the stages multiply: the number of paying, recommending customers is the product of conversion through every stage. The point is not to improve everything at once, but to find the stage that most constrains growth, the binding constraint, and focus effort there.",
      "The framework answers: which growth stage constrains the business most right now, and how much would a realistic improvement at each stage be worth?",
    ],
    whenToUse: [
      "Growth has stalled and teams disagree about whether the problem is traffic, onboarding, retention or monetisation.",
      "A company is spending heavily on acquisition but the active user base is not growing proportionately.",
      "Leadership needs a shared, simple view of the whole growth system and its metrics.",
      "A start-up or new product needs to decide where to focus a small team.",
      "A north star metric exists but nobody can explain which stage drives it.",
    ],
    howItWorks: [
      {
        step: "Define each stage's metric",
        detail: "Agree what counts as acquired (for example a sign-up), activated (the first meaningful value moment), retained (active again in week 4 or month 3), referred (invited someone who joined) and revenue (became paying, or revenue per user). Definitions must reflect real value, not vanity actions.",
      },
      {
        step: "Measure stage conversion by cohort",
        detail: "Track each sign-up cohort through the stages so that you compare like with like over time. Cohorts show whether improvements are real and whether newer users behave differently from older ones.",
      },
      {
        step: "Benchmark against your own history and goals",
        detail: "Compare current conversion at each stage with previous periods, segments and channels. Look for the stage with the largest fall or the largest gap versus what the business model requires.",
      },
      {
        step: "Size the value of a lift at each stage",
        detail: "Model what a realistic improvement, for example ten per cent relative, at each stage would add to revenue. Because stages multiply, a fix early in the funnel can be worth less than one at retention if retained users generate most value.",
      },
      {
        step: "Focus on the binding constraint",
        detail: "Choose the stage where an improvement is both valuable and achievable, set a target and run experiments there. Revisit the model when that stage improves, because the constraint will move.",
      },
    ],
    plainWords:
      "Imagine your lemonade stand as five steps: people walk past (acquisition), they take a first sip and like it (activation), they come back tomorrow (retention), they tell their friends (referral) and they pay (revenue). If lots of people walk past but nobody comes back, putting up a bigger sign won't help. You find the step where most people drop off and fix that one first.",
    examples: [
      {
        title: "Meal-kit subscription",
        situation: "A meal-kit company doubled paid acquisition spend but active subscribers grew only 10%.",
        analysis: "Cohort analysis showed activation (first box delivered and cooked) was healthy, but only 30% of new subscribers remained after the fourth box. Modelling showed a ten per cent relative improvement in retention would add more revenue than the same improvement in acquisition.",
        outcome: "The company reallocated budget to recipe variety and flexible skipping. In this illustration, month-three retention rose from 30% to 36%, increasing active subscribers more than the extra acquisition spend had.",
      },
      {
        title: "B2B SaaS analytics tool",
        situation: "A SaaS start-up had strong retention among teams that set up a dashboard but low overall growth.",
        analysis: "Only 22% of trial sign-ups connected a data source, the activation event. That stage was the binding constraint.",
        outcome: "A guided setup and pre-built templates raised activation, which flowed through to paid conversion.",
      },
      {
        title: "Consumer fintech app",
        situation: "A payments app had good activation and retention but slow growth.",
        analysis: "Referral was weak: few users invited others, despite the product being inherently social.",
        outcome: "A two-sided referral reward tied to the first payment between friends increased the share of new users arriving through invitations.",
      },
    ],
    visuals: [
      {
        type: "funnel",
        title: "AARRR funnel for a monthly sign-up cohort",
        caption: "The sharpest relative drop is between activation and retention, which makes retention the binding constraint here.",
        stages: [
          { label: "Acquisition (sign-ups)", value: 10000 },
          { label: "Activation", value: 5200 },
          { label: "Retention (month 3)", value: 1600 },
          { label: "Revenue (paying)", value: 900 },
          { label: "Referral (invited a user)", value: 250 },
        ],
      },
      {
        type: "bars",
        title: "Added monthly revenue from a 10% relative lift at each stage",
        caption: "Improving retention adds the most revenue in this model, so it is where effort should go first.",
        unit: "k",
        items: [
          { label: "Acquisition", value: 18 },
          { label: "Activation", value: 18 },
          { label: "Retention", value: 31, highlight: true },
          { label: "Referral", value: 6 },
          { label: "Revenue (ARPU)", value: 18 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Acquisition", formula: "New sign-ups (or qualified visitors) per period, with CAC by channel", meaning: "How many potential users enter, and at what cost." },
      { name: "Activation rate", formula: "Users reaching the value moment ÷ sign-ups", meaning: "Whether new users experience the product's core value." },
      { name: "Retention rate", formula: "Users active in period N ÷ users in starting cohort", meaning: "Whether value persists; usually the biggest driver of long-term growth." },
      { name: "Referral rate", formula: "Users who refer at least one new user ÷ active users", meaning: "Organic growth generated by users." },
      { name: "Revenue per user", formula: "Revenue ÷ active users (or ARPU, ARPPU)", meaning: "How well usage turns into money." },
    ],
    pitfalls: [
      "Defining stages with vanity metrics, such as app installs as acquisition or a single login as activation.",
      "Looking at aggregate stage totals rather than cohorts, which mixes old and new users.",
      "Trying to improve all five stages at once, spreading effort too thin.",
      "Pouring money into acquisition when retention is the constraint, which fills a leaky bucket.",
      "Treating the order of stages as fixed; referral and revenue can happen in different orders for different products.",
    ],
    related: ["funnel", "activation", "cohort", "referral-loop"],
  },

  /* ------------------------------------------------------------------ */
  jtbd: {
    overview: [
      "Jobs-to-be-Done (JTBD) is a way of understanding why customers buy, use and leave a product by focusing on the progress they are trying to make in a particular situation. Customers 'hire' a product to get a job done and 'fire' it when something else does the job better.",
      "The idea was popularised by Clayton Christensen, whose well-known milkshake example showed that morning commuters bought milkshakes to make a long, boring drive more bearable and keep them full until lunch, not because of the milkshake's attributes. Practitioners such as Bob Moesta developed the switch interview and the forces of progress: the push of the current situation, the pull of the new solution, the anxiety about switching and the habit of the present.",
      "The framework answers: what job are customers hiring us for, what are we really competing with, and where do we fail the job so that customers do not switch to us or switch away?",
    ],
    whenToUse: [
      "Customer segments based on demographics do not explain why people buy or churn.",
      "Messaging talks about features but conversion and differentiation are weak.",
      "Churn reasons in surveys are vague, such as 'too expensive' or 'not using it enough'.",
      "A product team needs to decide what to build next and has too many feature requests.",
      "A new competitor from an unexpected category is taking customers.",
    ],
    howItWorks: [
      {
        step: "Interview recent switchers in and out",
        detail: "Talk to people who recently started using the product and people who recently left, ideally within the last few months while memories are fresh. Reconstruct the timeline: the first thought that something needed to change, the search, the comparison and the decision.",
      },
      {
        step: "Map the forces of progress",
        detail: "For each switch, capture the push (what was wrong with the old way), the pull (what was attractive about the new one), the anxiety (worries about the new solution) and the habit (comfort with the status quo). A switch happens only when push and pull outweigh anxiety and habit.",
      },
      {
        step: "Define the core jobs",
        detail: "Cluster interviews into a handful of jobs expressed as progress in a context, for example 'when I start a new role, help me look competent with numbers quickly'. Include functional, emotional and social dimensions.",
      },
      {
        step: "Identify real competitors and failure points",
        detail: "List everything customers hired for the same job, often including spreadsheets, doing nothing or a different category. Identify where the product underserves the job, especially at the moments that triggered churn.",
      },
      {
        step: "Align messaging, product and journeys to jobs",
        detail: "Rewrite propositions around the job and the situation, reduce the anxieties that block switching, and prioritise product work that removes failure points. Use job-based segments in targeting and onboarding.",
      },
    ],
    plainWords:
      "People don't really want a drill; they want a hole in the wall so they can hang up a picture of their family. Jobs-to-be-Done means asking what someone is really trying to get done, and when. Once you know that, you can see that you are competing not only with other drills but with sticky hooks, and you can explain why your product helps them hang that picture best.",
    examples: [
      {
        title: "Online learning platform",
        situation: "A language-learning app targeted 'people interested in learning a language' and had high trial sign-ups but poor retention.",
        analysis: "Switch interviews found three jobs: preparing for a move abroad on a deadline, keeping a brain active as a daily habit, and passing a formal exam. The deadline job had the strongest push, but the app's playful lessons failed it because users could not see progress towards conversational ability.",
        outcome: "The app created a goal-based track for people moving abroad with a visible readiness score and practical conversation drills. Illustratively, retention for that segment rose markedly while the habit-focused segment kept the existing experience.",
      },
      {
        title: "Accounting software for small businesses",
        situation: "A cloud accounting tool lost many customers to spreadsheets in their first months.",
        analysis: "Churn interviews showed the hiring job was 'get my tax return done without stress', but habit and anxiety about mistakes in categorising transactions made users revert to spreadsheets and their accountant.",
        outcome: "Onboarding was rebuilt around preparing for tax deadlines, with an accountant-invite feature to reduce anxiety, which lowered early churn.",
      },
      {
        title: "Quick-service restaurant breakfast",
        situation: "A QSR chain wanted to grow breakfast sales.",
        analysis: "Research showed commuters hired breakfast to 'eat something filling with one hand while travelling'. The competition was coffee shops and petrol stations, not other restaurants.",
        outcome: "The chain introduced handheld options and faster mobile ordering for collection, positioned for the commute.",
      },
    ],
    visuals: [
      {
        type: "matrix",
        title: "Forces of progress",
        caption: "A customer switches only when push and pull together outweigh anxiety and habit; marketing can strengthen pull and reduce anxiety.",
        xLabel: "Promotes switching → blocks switching",
        yLabel: "About the old way → about the new solution",
        quadrants: ["Pull of the new solution", "Anxiety about the new solution", "Push of the current situation", "Habit of the present"],
      },
      {
        type: "bars",
        title: "Churn interviews by unmet job",
        caption: "Most churn traces back to one failed job, which is a clearer priority than a generic 'too expensive'.",
        unit: "% of churners",
        items: [
          { label: "Couldn't see progress", value: 41, highlight: true },
          { label: "Too much effort to keep up", value: 24 },
          { label: "Goal achieved", value: 18 },
          { label: "Switched to competitor feature", value: 11 },
          { label: "Price", value: 6 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Job importance and satisfaction", formula: "Survey ratings per job outcome; opportunity ≈ importance + max(importance − satisfaction, 0)", meaning: "Highlights jobs or outcomes that matter a lot but are poorly served." },
      { name: "Switch-in share by job", formula: "New customers citing a job ÷ total new customers", meaning: "Which jobs bring customers in, guiding messaging and targeting." },
      { name: "Churn rate by job segment", formula: "Churned customers in job segment ÷ customers in segment", meaning: "Which jobs the product fails, guiding product priorities." },
      { name: "Time to first job completion", meaning: "How quickly a new customer achieves the progress they hired the product for." },
    ],
    pitfalls: [
      "Asking customers what features they want instead of reconstructing what they actually did and why.",
      "Defining jobs too broadly ('be happy') or too narrowly (describing a feature).",
      "Interviewing only loyal customers and missing the switchers who reveal the forces of progress.",
      "Ignoring emotional and social dimensions of the job.",
      "Producing a job map that never changes messaging, onboarding or the roadmap.",
    ],
    related: ["stp", "churn", "nps-drivers", "value-based-pricing"],
  },

  /* ------------------------------------------------------------------ */
  stp: {
    overview: [
      "Segmentation, Targeting and Positioning (STP) is a foundational marketing strategy framework, associated with Philip Kotler and widely taught since the 1960s and 1970s. It moves from understanding the market to deciding where to compete and how to be chosen.",
      "Segmentation divides the market into groups with distinct needs, behaviours or value. Targeting evaluates these segments for attractiveness (size, growth, profitability) and for the company's ability to win, then selects a focus. Positioning defines the distinctive place the brand should occupy in the minds of the chosen targets, relative to competitors.",
      "The framework answers: are we targeting the right customers, and do we offer them a proposition that is distinctive and relevant compared with the alternatives?",
    ],
    whenToUse: [
      "Marketing tries to appeal to everyone and messaging feels generic.",
      "Acquisition costs are rising because the brand competes head-on for the same audiences as larger competitors.",
      "Existing segments are demographic and do not predict needs, value or response.",
      "A new product, market entry or rebrand requires a clear choice of who it is for.",
      "Pricing is under pressure because customers see little difference between the brand and competitors.",
    ],
    howItWorks: [
      {
        step: "Segment by needs and value",
        detail: "Combine customer data (value, behaviour, product holdings) with research on needs and attitudes to form segments that differ meaningfully in what they want and what they are worth. Good segments are measurable, large enough, reachable and respond differently to marketing.",
      },
      {
        step: "Profile each segment",
        detail: "Describe each segment's size, growth, value, needs, current share of wallet, preferred channels and which competitors they use. Name segments by their need, not just demographics, so they guide decisions.",
      },
      {
        step: "Score attractiveness and fit",
        detail: "Rate segments on attractiveness (size, growth, margin, competitive intensity) and on your ability to win (product fit, brand perception, cost to serve, channel access). Weight criteria in advance so scoring is not reverse-engineered to justify a favourite.",
      },
      {
        step: "Choose targets",
        detail: "Select one primary target and, if resources allow, one or two secondary targets. Be explicit about which segments you will serve but not actively pursue, since focus is the purpose of targeting.",
      },
      {
        step: "Write positioning per target",
        detail: "For each target, define the frame of reference (what category or alternative you compete with), the point of difference that matters to them, and the reasons to believe. A common form is: for [target] who [need], [brand] is the [frame] that [benefit], because [proof].",
      },
      {
        step: "Translate into the marketing mix and track",
        detail: "Align product, pricing, channels and creative to the targets and positioning. Track share and perception in the target segments, not just overall.",
      },
    ],
    plainWords:
      "Imagine you run a stall at a busy market. Some visitors want something quick and cheap, others want something special to take home. You can't be best at everything, so you pick the group you can serve best, set up your stall for them, and make it clear in one sentence why your stall is the one for them. That's segmenting the crowd, choosing your target and positioning your stall.",
    examples: [
      {
        title: "Mid-sized bank credit cards",
        situation: "A bank marketed its credit card to all adults with mass-market messaging and low response.",
        analysis: "Needs-based segmentation identified five groups. Frequent international travellers were profitable, growing and poorly served by competitors' high foreign transaction fees, and the bank had a strong travel partnership.",
        outcome: "The bank targeted this segment with a positioning around 'the card that travels as well as you do', with no foreign transaction fees and partner lounge access. Illustratively, response among the target segment was three times that of the previous generic campaign.",
      },
      {
        title: "Sportswear e-commerce",
        situation: "A sportswear brand competed with global giants on broad fitness messaging and rising paid media costs.",
        analysis: "Segment scoring showed trail runners were a smaller but fast-growing group with high basket values and an under-served need for durable kit, where the brand's product strength was greatest.",
        outcome: "Repositioning to 'built for the trail' with community events and specialist content lowered acquisition costs among the target and improved repeat purchase.",
      },
      {
        title: "Telecom broadband",
        situation: "A broadband provider competed mainly on price.",
        analysis: "Research found a sizeable segment of home workers who valued reliability and upload speed over price, and who were dissatisfied with incumbents.",
        outcome: "A targeted 'work-from-home' proposition with service guarantees allowed a price premium in that segment.",
      },
    ],
    visuals: [
      {
        type: "matrix",
        title: "Segment attractiveness vs ability to win",
        caption: "Targets sit top right: attractive segments where the brand has a real advantage; attractive segments without fit need investment or should be left.",
        xLabel: "Ability to win",
        yLabel: "Segment attractiveness",
        quadrants: ["Build capability or avoid", "Primary targets", "Ignore", "Serve opportunistically"],
        points: [
          { label: "Frequent travellers", x: 80, y: 82 },
          { label: "Young professionals", x: 35, y: 75 },
          { label: "Families", x: 60, y: 55 },
          { label: "Students", x: 70, y: 25 },
          { label: "Retirees", x: 25, y: 30 },
        ],
      },
      {
        type: "bars",
        title: "Segment value index",
        caption: "Segments differ widely in value per customer, which is why treating the market as one group wastes budget.",
        unit: "index",
        items: [
          { label: "Frequent travellers", value: 190, highlight: true },
          { label: "Young professionals", value: 120 },
          { label: "Families", value: 100 },
          { label: "Retirees", value: 70 },
          { label: "Students", value: 45 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Segment size and value", formula: "Customers (or market) in segment × average value per customer", meaning: "The revenue pool a segment represents." },
      { name: "Share of segment", formula: "Your customers (or revenue) in segment ÷ total segment customers (or spend)", meaning: "How well you already win in each segment." },
      { name: "Attractiveness and fit scores", formula: "Weighted sum of criteria scores", meaning: "Structured basis for choosing targets." },
      { name: "Positioning perception", meaning: "Share of target customers who associate the brand with the intended point of difference, tracked through research." },
      { name: "CAC and conversion in target segments", meaning: "Whether focus makes acquisition more efficient." },
    ],
    pitfalls: [
      "Segmenting only by demographics that do not predict needs or behaviour.",
      "Choosing too many targets, which dilutes focus and leaves positioning generic.",
      "Positioning on a benefit that matters to the company but not to the target customer.",
      "Claiming a position competitors already own, or one the product cannot support.",
      "Creating segments that cannot be identified or reached in data and media.",
    ],
    related: ["jtbd", "competitive", "rfm", "brand-funnel"],
  },
};
