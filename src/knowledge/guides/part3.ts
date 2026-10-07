import type { FrameworkGuide } from "./types";

export const GUIDES_PART3: Record<string, FrameworkGuide> = {
  /* ------------------------------------------------------------------ */
  competitive: {
    overview: [
      "Competitive and share-of-wallet analysis measures two related things: how strong the pressure from rivals is in your category, and how much of each customer's total category spend you actually capture. Market share tells you how you rank across the whole market; share of wallet tells you how loyal and how fully served your existing customers are.",
      "The share-of-wallet idea grew out of retail banking and grocery research in the 1990s, when firms noticed that many 'loyal' customers were in fact spreading most of their spend across competitors. A customer who spends 1,000 a year in the category but only 200 with you is a growth opportunity hidden inside your own base, and often a defection risk.",
      "Combined with a structured benchmark of price, offer and experience against named competitors, the analysis answers a practical question: are we losing to competitors, and if so on which dimension and in which segments?",
    ],
    whenToUse: [
      "Revenue per customer is flat or falling while customer counts look stable, suggesting spend is leaking to rivals.",
      "A new entrant or aggressive discounter has arrived and you need to know which segments are exposed.",
      "Win/loss or churn surveys keep naming the same competitor, but nobody has quantified why.",
      "You are planning a price change or loyalty programme and need to know where you sit versus alternatives.",
      "Panel or market data show share loss but internal dashboards only track your own customers.",
      "Leadership is debating whether to defend the core base or attack a competitor's customers.",
    ],
    howItWorks: [
      {
        step: "Define the category and the competitive set",
        detail: "Write down what customers see as substitutes, not just the companies you consider rivals; for a coffee chain this may include supermarkets and office machines. Agree a fixed list of 3–6 named competitors plus an 'other' bucket so comparisons stay consistent over time.",
      },
      {
        step: "Benchmark price, offer and experience",
        detail: "Build a comparison grid covering list price, typical promoted price, range or features, delivery or service levels and customer ratings. Score each dimension on the same scale and note where you are clearly ahead, at parity or behind.",
      },
      {
        step: "Estimate share of wallet by segment",
        detail: "Combine your own spend data with an estimate of total category spend from surveys, panel data, bureau data or modelled income bands. Share of wallet = your spend ÷ total category spend; calculate it per segment, because averages hide the segments where you are a minor supplier.",
      },
      {
        step: "Identify switching triggers",
        detail: "Look at the moments when wallet share drops: a price rise, a stock-out, a move of house, a contract renewal, a poor service incident. Survey lapsed or declining customers and link their answers to the benchmark grid to find the dimension that tipped them.",
      },
      {
        step: "Size the gap and the opportunity",
        detail: "Multiply the share-of-wallet gap by the number of customers and their category spend to see how much revenue sits with competitors in each segment. Rank segments by recoverable value, not by the size of the gap alone.",
      },
      {
        step: "Prioritise defensive and offensive moves",
        detail: "Defensive moves protect high-value segments where you are already strong, such as matching a competitor on the dimension that drives switching. Offensive moves target segments where you hold low wallet share but have a credible advantage, such as cross-selling categories the customer currently buys elsewhere.",
      },
    ],
    plainWords:
      "Imagine you run a lemonade stand and the lady next door buys five drinks every week, but only one comes from you and four come from the stand across the road. She looks like a regular customer, but you are only getting one-fifth of what she spends. This analysis is about noticing that, finding out why she goes across the road (cheaper, colder, closer?) and deciding whether to fix that one thing.",
    examples: [
      {
        title: "Grocery retailer losing the weekly shop",
        situation: "A mid-sized grocer saw stable footfall but basket values down 6% year on year after a discounter opened nearby.",
        analysis: "Using loyalty card data and a survey of total grocery spend, the grocer estimated share of wallet at 48% for families, down from 58%. The benchmark showed parity on fresh food but a 12% price gap on 40 staple items, and the survey linked switching to those staples.",
        outcome: "Price-matching the 40 staples and promoting them in-store recovered about half of the lost wallet share in the family segment within two quarters, at a margin cost lower than the revenue at risk.",
      },
      {
        title: "Retail bank and the multi-banked customer",
        situation: "A bank's current-account customers held on average 1.4 products, but credit bureau data showed most also held savings and credit cards elsewhere.",
        analysis: "Share of wallet for borrowing products was estimated at 22% among affluent customers. Switching triggers clustered around home moves and salary rises, when customers shopped around for rates the bank was not proactively offering.",
        outcome: "Triggered offers at those life events lifted affluent product holding to 1.7 over a year, and the bank stopped a broad rate-cut campaign that would have subsidised customers who were already loyal.",
      },
      {
        title: "Telecom challenger attack",
        situation: "A mobile operator's market share fell two points after a challenger launched cheaper SIM-only plans.",
        analysis: "The benchmark showed the incumbent ahead on coverage and roaming but behind on price for light users. Panel data showed losses concentrated among under-30 SIM-only customers; heavy-data and family plans were holding.",
        outcome: "Instead of cutting prices across the board, the operator launched a sub-brand for price-sensitive light users and protected margin on the core brand.",
      },
    ],
    visuals: [
      {
        type: "bars",
        title: "Share of wallet by segment",
        caption: "Families and young singles spend most of their category budget elsewhere, which is where the recoverable revenue sits.",
        unit: "%",
        items: [
          { label: "Retirees", value: 71 },
          { label: "Couples", value: 62 },
          { label: "Families", value: 48, highlight: true },
          { label: "Young singles", value: 35, highlight: true },
          { label: "Students", value: 29 },
        ],
      },
      {
        type: "matrix",
        title: "Where to defend and where to attack",
        caption: "Segments that are valuable but have low wallet share are the main offensive targets; high-value, high-share segments need defending.",
        xLabel: "Our share of wallet",
        yLabel: "Segment category spend",
        quadrants: ["Attack: big spend, low share", "Defend: big spend, high share", "Monitor: small, low share", "Maintain: small, high share"],
        points: [
          { label: "Families", x: 35, y: 82 },
          { label: "Retirees", x: 78, y: 60 },
          { label: "Couples", x: 66, y: 70 },
          { label: "Young singles", x: 28, y: 38 },
          { label: "Students", x: 20, y: 18 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Share of wallet", formula: "Our category spend from customer ÷ customer's total category spend", meaning: "How much of each customer's budget you capture; the core loyalty measure." },
      { name: "Market share", formula: "Our category sales ÷ total category sales", meaning: "Your position in the market as a whole, including non-customers." },
      { name: "Wallet gap value", formula: "(Target SOW − current SOW) × customers × category spend per customer", meaning: "Revenue currently going to competitors that could realistically be recovered." },
      { name: "Price index", formula: "Our price ÷ competitor average price × 100", meaning: "Whether you are priced above (over 100) or below the competitive set." },
      { name: "Switching rate", formula: "Customers who moved most spend to a rival ÷ customers at start of period", meaning: "How quickly the competitive threat is converting into loss." },
    ],
    pitfalls: [
      "Defining competitors too narrowly and missing substitutes that customers actually use.",
      "Reporting average share of wallet, which hides segments where you are a minor supplier.",
      "Treating a price gap as the cause without checking whether switchers cite price at all.",
      "Responding with blanket discounts that give money away to customers who were not at risk.",
      "Running a one-off benchmark and never refreshing it as competitors change offers.",
    ],
    related: ["stp", "price-elasticity", "churn", "brand-funnel"],
  },

  /* ------------------------------------------------------------------ */
  clv: {
    overview: [
      "Customer lifetime value (CLV or LTV) estimates the total margin a customer will generate over the whole relationship, not just on the first purchase. It turns retention, purchase frequency, basket size and margin into one forward-looking number per customer, segment or acquisition source.",
      "The concept has roots in direct marketing and database marketing in the 1980s and was formalised by academics such as Gupta, Lehmann and Fader, whose probabilistic models (for example BG/NBD) estimate future purchasing from past behaviour. In practice, most marketing teams use a simpler cohort-based approach that is good enough for decisions.",
      "CLV answers the question: which customers and channels create long-term value? Set against customer acquisition cost (CAC), it tells you how much you can afford to pay for a customer and where to shift budget.",
    ],
    whenToUse: [
      "Paid channels are judged on first-order ROAS and you suspect some cheap channels bring low-value customers.",
      "You need to set a maximum allowable CAC or bid for each channel or segment.",
      "Retention or loyalty investments need a financial case that shows the value of keeping a customer longer.",
      "Finance asks for unit economics, LTV:CAC or payback period before approving growth spend.",
      "Different products or entry offers seem to bring customers who behave very differently afterwards.",
    ],
    howItWorks: [
      {
        step: "Build acquisition cohorts",
        detail: "Group customers by the month or quarter they first purchased and by attributes such as acquisition source, first product and region. Cohorts let you compare like with like and see how behaviour unfolds over time.",
      },
      {
        step: "Estimate retention and spend curves",
        detail: "For each cohort, track the share of customers still active and average revenue per active customer in each period after acquisition. Where history is short, fit a decay curve or use a probabilistic model to extend the curve beyond observed data.",
      },
      {
        step: "Convert revenue into margin",
        detail: "Apply gross margin and subtract variable costs such as fulfilment, payment fees, returns and servicing. CLV built on revenue overstates value, especially for discount-heavy or high-return segments.",
      },
      {
        step: "Sum and discount over a sensible horizon",
        detail: "Add margin per period over a horizon you trust, often 24–36 months, and discount future periods to today's money. A simple closed form for steady retention is CLV ≈ margin per period × retention ÷ (1 + discount rate − retention).",
      },
      {
        step: "Compare with CAC by segment and source",
        detail: "Divide CLV by the fully loaded acquisition cost for the same segment or channel. Also calculate payback: the number of months until cumulative margin covers CAC, which matters for cash-constrained businesses.",
      },
      {
        step: "Reallocate budget and act on drivers",
        detail: "Shift spend towards sources with the best LTV:CAC and acceptable payback, and set different bid caps by expected value. Use the drivers (retention, frequency, basket, margin) to decide which lever retention marketing should pull.",
      },
    ],
    plainWords:
      "Think of a football club selling season tickets. A fan who buys one match ticket and never comes back is worth a little; a fan who renews every year for ten years and buys a shirt each season is worth a lot more. Lifetime value is simply adding up what a fan is likely to bring in over all those years, after costs, so the club knows how much it is sensible to spend to win each new fan.",
    examples: [
      {
        title: "E-commerce: cheap customers that cost more",
        situation: "An online fashion retailer acquired customers through a discount marketplace at a CAC of 18 and through search at a CAC of 35, and favoured the marketplace.",
        analysis: "Cohort analysis showed marketplace customers had a 12-month repeat rate of 15% and return rates of 40%, giving a 24-month margin CLV of about 30. Search customers repeated at 38% with lower returns, giving a CLV of about 110.",
        outcome: "LTV:CAC was 1.7 for the marketplace and 3.1 for search. The retailer cut marketplace spend by a third and raised search bids, increasing total 24-month margin from the same budget.",
      },
      {
        title: "SaaS: plan entry point matters",
        situation: "A B2B SaaS company offered both a monthly starter plan and an annual team plan, and marketing was rewarded on sign-up volume.",
        analysis: "Starter customers churned at 6% a month with 40 monthly gross margin, giving a CLV of roughly 40 × 0.94 ÷ (1.01 − 0.94) ≈ 540. Annual team customers churned at around 1.5% a month equivalent with 220 monthly margin, giving a CLV of over 8,000.",
        outcome: "The team changed landing pages and sales follow-up to steer qualified visitors towards the team plan, and set separate CAC ceilings for each entry plan.",
      },
      {
        title: "Airline loyalty: valuing a frequent flyer",
        situation: "An airline debated whether a fast-track status offer for new business travellers was worth its cost.",
        analysis: "Business travellers who reached mid-tier status in year one had a 3-year margin CLV around 4.5 times that of those who did not, mainly through higher frequency and preference for the airline on competitive routes.",
        outcome: "A controlled test of the fast-track offer showed enough incremental status attainment to justify it in the business segment, but not for leisure travellers, where it was withdrawn.",
      },
    ],
    visuals: [
      {
        type: "line",
        title: "Cumulative margin per customer by acquisition source",
        caption: "Marketplace customers look cheap, but search customers keep buying and pass the CAC line much sooner and finish far higher.",
        xLabels: ["M0", "M3", "M6", "M12", "M18", "M24"],
        yLabel: "Cumulative margin per customer",
        series: [
          { name: "Search", points: [14, 35, 55, 80, 97, 110] },
          { name: "Marketplace", points: [8, 14, 18, 24, 27, 30] },
          { name: "Search CAC", points: [35, 35, 35, 35, 35, 35] },
        ],
      },
      {
        type: "bars",
        title: "LTV:CAC by channel",
        caption: "Ratios below about 1 destroy value; the right threshold depends on margin and cash, so compare channels to each other first.",
        items: [
          { label: "Referral", value: 4.2 },
          { label: "Search", value: 3.1 },
          { label: "Social", value: 2.2 },
          { label: "Affiliates", value: 1.9 },
          { label: "Marketplace", value: 1.7, highlight: true },
        ],
      },
    ],
    keyMetrics: [
      { name: "Customer lifetime value (simple)", formula: "Margin per period × retention ÷ (1 + discount rate − retention)", meaning: "Discounted margin a customer is expected to generate with steady retention." },
      { name: "LTV:CAC", formula: "CLV ÷ fully loaded acquisition cost", meaning: "How many units of value each unit of acquisition spend returns." },
      { name: "CAC payback", formula: "CAC ÷ monthly margin per customer (adjusted for churn)", meaning: "Months until a customer has paid back what it cost to acquire them." },
      { name: "Retention rate", formula: "Customers active at period end from cohort ÷ cohort size", meaning: "The biggest single driver of CLV in most businesses." },
      { name: "Average order margin", formula: "(Revenue − COGS − variable costs) ÷ orders", meaning: "Value created per transaction, after returns and fulfilment." },
    ],
    pitfalls: [
      "Using revenue instead of margin, which inflates CLV for discount-heavy or high-return customers.",
      "Projecting short observed retention far into the future without validating the curve.",
      "Averaging CLV across all customers, which hides the channels and segments that destroy value.",
      "Comparing CLV with a CAC that excludes agency, tooling, sales or promotional costs.",
      "Treating CLV as fixed rather than something marketing can change through retention and cross-sell.",
    ],
    related: ["cac", "cohort", "churn", "paid-efficiency"],
  },

  /* ------------------------------------------------------------------ */
  "brand-funnel": {
    overview: [
      "The brand health funnel tracks how people move from knowing your brand to buying and staying loyal: awareness, consideration, preference, purchase and loyalty. Measuring the same stages for competitors shows where your brand loses people relative to the category, not just in absolute terms.",
      "It builds on classic hierarchy-of-effects models such as AIDA, and more recently on the work of Byron Sharp and the Ehrenberg-Bass Institute, which emphasises mental availability (being thought of in buying situations) and distinctive brand assets. Share of search, the brand's share of category search queries, is now often used as a fast proxy for brand demand.",
      "The funnel answers: is demand being lost at the top of the funnel? It separates problems of fame (not enough people know or think of you) from problems of appeal (people know you but do not choose you) and from problems of experience (they buy but do not return).",
    ],
    whenToUse: [
      "Performance marketing is getting more expensive and conversion rates are steady, suggesting fewer people are entering the funnel.",
      "Branded search volume or share of search is declining against competitors.",
      "A brand tracker exists but results are reported as isolated scores with no diagnosis.",
      "You need to justify or calibrate the split between brand building and activation spend.",
      "After a repositioning, rebrand or new entrant, you need to see which stage has moved.",
    ],
    howItWorks: [
      {
        step: "Define stages and measures",
        detail: "Use survey questions that map to each stage: prompted and unprompted awareness, would consider, preferred brand, bought in the last period, and would buy again. Keep wording and sample design stable so trends are comparable.",
      },
      {
        step: "Measure your brand and competitors",
        detail: "Ask the same questions about 3–6 competitors in the same survey. Absolute levels matter less than how your stage-to-stage conversion compares with brands of similar size.",
      },
      {
        step: "Calculate stage conversion ratios",
        detail: "Divide each stage by the one before, for example consideration ÷ awareness. A brand with high awareness but weak awareness-to-consideration conversion has an appeal problem, not a reach problem.",
      },
      {
        step: "Find the leaking stage",
        detail: "Compare your conversion at each stage with the category average or the nearest competitor. The stage with the largest negative gap, weighted by how many people it affects, is the priority.",
      },
      {
        step: "Diagnose with assets and entry points",
        detail: "For awareness and consideration leaks, test recognition of distinctive assets (logo, colours, characters) and how strongly the brand is linked to category entry points, the situations in which people start looking. For later leaks, look at price perception, availability and experience.",
      },
      {
        step: "Balance brand and activation spend",
        detail: "Top-of-funnel leaks call for broad-reach brand activity; lower-funnel leaks call for offer, availability or experience fixes. Track share of search monthly as an early signal between tracker waves.",
      },
    ],
    plainWords:
      "Picture a food court with three food counters. First, people have to notice your counter exists; then they have to think 'that might be nice'; then pick it over the others; then actually buy; then come back tomorrow. If loads of people notice your counter but hardly anyone thinks the food looks good, louder signs will not help. The brand funnel tells you which of those steps is where people drift off to the other counters.",
    examples: [
      {
        title: "Quick-service restaurant with a consideration problem",
        situation: "A burger chain had 92% prompted awareness, similar to its main rival, but a smaller share of visits.",
        analysis: "Awareness-to-consideration conversion was 48% against 66% for the rival. Survey verbatims and entry-point questions showed the brand was not linked to 'quick lunch near work' or 'treat for the family', two large occasions.",
        outcome: "The chain redirected creative to those occasions and its menu value, and consideration rose by eight points over three tracker waves with no change in awareness.",
      },
      {
        title: "Direct-to-consumer skincare and the awareness ceiling",
        situation: "A DTC skincare brand saw rising cost per acquisition on social channels despite stable site conversion.",
        analysis: "Brand funnel data showed strong conversion at every stage once people were aware, but unprompted awareness of only 6%. Share of search had flattened, suggesting the pool of interested people was being exhausted.",
        outcome: "The brand shifted 25% of its budget into broad-reach video and out-of-home, and share of search began to grow two months later, followed by lower acquisition costs.",
      },
      {
        title: "Insurance and the loyalty leak",
        situation: "A car insurer had above-average purchase share but was losing customers at renewal.",
        analysis: "Purchase-to-loyalty conversion was 55% versus a category average near 70%. Lapsed customers cited renewal price rises and a slow claims process, not lack of awareness.",
        outcome: "The insurer cut brand reach spend modestly and invested in claims experience and renewal pricing transparency, which improved retention more than extra advertising would have.",
      },
    ],
    visuals: [
      {
        type: "funnel",
        title: "Brand funnel: our brand",
        caption: "The sharpest drop is from awareness to consideration, which points to an appeal or relevance problem rather than a reach problem.",
        stages: [
          { label: "Aware", value: 90 },
          { label: "Consider", value: 43 },
          { label: "Prefer", value: 26 },
          { label: "Purchased", value: 19 },
          { label: "Loyal", value: 13 },
        ],
      },
      {
        type: "bars",
        title: "Awareness → consideration conversion vs competitors",
        caption: "With similar awareness, our brand converts far fewer aware people into considerers than the leading rival.",
        unit: "%",
        items: [
          { label: "Rival A", value: 66 },
          { label: "Rival B", value: 58 },
          { label: "Category avg", value: 57 },
          { label: "Our brand", value: 48, highlight: true },
          { label: "Rival C", value: 44 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Stage conversion", formula: "Stage n % ÷ stage n−1 %", meaning: "How well the brand moves people from one stage to the next." },
      { name: "Conversion gap", formula: "Our stage conversion − category or rival stage conversion", meaning: "Where the brand under-performs relative to its size; the diagnostic signal." },
      { name: "Share of search", formula: "Our branded search volume ÷ total branded search volume in category", meaning: "Fast, low-cost proxy for brand demand that often leads market share." },
      { name: "Unprompted awareness", formula: "Respondents naming brand without prompt ÷ respondents", meaning: "Mental availability; whether people think of you unprompted." },
      { name: "Distinctive asset recognition", formula: "Respondents correctly attributing an asset ÷ respondents", meaning: "Whether your brand cues are actually linked to you in memory." },
    ],
    pitfalls: [
      "Looking at absolute stage levels without comparing conversion against competitors of similar size.",
      "Changing survey wording or sample between waves and mistaking method changes for real movement.",
      "Reacting to small wave-to-wave changes that are within sampling error.",
      "Assuming every leak is fixed by more awareness spend when the problem is appeal, price or experience.",
      "Ignoring light and non-buyers, who are where most brand growth comes from.",
    ],
    related: ["share-of-voice", "stp", "funnel", "mmm"],
  },

  /* ------------------------------------------------------------------ */
  "share-of-voice": {
    overview: [
      "Share of voice (SOV) is your brand's share of total category advertising activity, usually measured as media spend or impressions. Share of market (SOM) is your share of category sales. Comparing the two predicts whether a brand is likely to grow, hold or decline its share over time.",
      "The relationship was popularised by John Philip Jones in the 1990s and later by Les Binet and Peter Field's analysis of the IPA effectiveness databank. Their work found that, on average, brands whose SOV exceeds their SOM tend to gain share, and those below tend to lose it. The difference, excess share of voice (ESOV), is the planning lever.",
      "SOV versus SOM answers: are we investing enough to hold or grow share? It is a strategic budget-setting tool, best used alongside other evidence, and its relationship with growth varies by category, brand size and creative quality.",
    ],
    whenToUse: [
      "Setting or defending the annual brand media budget and needing an outside-in reference point.",
      "A competitor has sharply increased spend and you need to judge the threat.",
      "Market share is slipping slowly despite good short-term campaign metrics.",
      "Entering a new market or category and deciding how much investment growth requires.",
      "Leadership proposes cutting brand spend to protect short-term profit.",
    ],
    howItWorks: [
      {
        step: "Define the category and the market",
        detail: "Use the same category definition for both SOV and SOM, otherwise the comparison is meaningless. Decide whether you are working nationally, by region or by sub-category.",
      },
      {
        step: "Estimate share of voice",
        detail: "Use media intelligence services, ad libraries, agency estimates or impression share data to estimate each brand's spend or weighted impressions. SOV = our spend ÷ total category spend; where digital spend is opaque, triangulate several sources and document assumptions.",
      },
      {
        step: "Measure share of market",
        detail: "Take market share from panel data, retail audits, industry bodies or financial filings for the same period. Use value or volume share consistently.",
      },
      {
        step: "Compute excess share of voice",
        detail: "ESOV = SOV − SOM in percentage points. Positive ESOV suggests investment to grow; negative ESOV suggests share is likely to erode unless creative or other factors compensate.",
      },
      {
        step: "Plot the category",
        detail: "Chart every brand's SOV against SOM. Brands above the diagonal are investing for growth; those below are harvesting. Watch for competitors with high ESOV, which signals intent to take share.",
      },
      {
        step: "Set the investment level",
        detail: "Decide the target share change, then translate it into a target ESOV and media budget using historical response in your own category where available. Revisit annually, and pair the budget with creative quality checks because poor creative weakens the link.",
      },
    ],
    plainWords:
      "Imagine a playground where several ice-cream vans are all ringing their bells. If your van makes a quarter of all the bell noise but only sells a fifth of the ice creams, you will probably sell more over time, because people keep hearing you. If you sell a third of the ice creams but make only a tenth of the noise, people will slowly start forgetting you. Share of voice is about checking whether your bell is loud enough for the size of business you want.",
    examples: [
      {
        title: "Consumer bank holding share under pressure",
        situation: "A bank with 18% share of current accounts cut brand spend to 12% SOV while a digital challenger ran at 15% SOV with 4% SOM.",
        analysis: "The bank's ESOV was −6 points; the challenger's was +11. Account switching data over the following year showed the challenger winning a growing share of new-to-bank customers among under-35s.",
        outcome: "The bank restored SOV to around its market share and focused creative on the under-35 segment, stabilising share of new accounts.",
      },
      {
        title: "Snack brand entering a new country",
        situation: "A snack brand launching in a new market had 0% share and needed a launch budget.",
        analysis: "The category's total media spend was estimated from media intelligence. To reach a 5% share goal over three years, the team planned for 10–12% SOV in the first two years, deliberately well above target share.",
        outcome: "The launch reached 3% share in year one; spend was then tapered towards an ESOV of about +3 points as distribution matured.",
      },
      {
        title: "Retailer's paid search share of voice",
        situation: "An electronics retailer wanted to know whether rising competitor search budgets explained falling online share.",
        analysis: "Impression share on generic category terms fell from 30% to 19% while online market share fell from 22% to 20%. Competitor bidding had pushed the retailer below its share on high-intent terms.",
        outcome: "Raising bids selectively on high-margin category terms restored impression share to around 25%, and online share recovered by one point.",
      },
    ],
    visuals: [
      {
        type: "matrix",
        title: "Share of voice vs share of market",
        caption: "Brands to the upper-left of the diagonal spend above their share and tend to grow; brands to the lower-right are harvesting and tend to lose share.",
        xLabel: "Share of market",
        yLabel: "Share of voice",
        quadrants: ["Investing to grow", "Large and defending", "Small and quiet", "Harvesting share"],
        points: [
          { label: "Challenger", x: 12, y: 45 },
          { label: "Our brand", x: 60, y: 40 },
          { label: "Leader", x: 85, y: 82 },
          { label: "Niche brand", x: 15, y: 10 },
          { label: "Rival B", x: 38, y: 42 },
        ],
      },
      {
        type: "bars",
        title: "Excess share of voice by brand",
        caption: "Our brand runs a negative ESOV, while the challenger spends far above its share and is the main threat.",
        unit: "pts",
        items: [
          { label: "Challenger", value: 11 },
          { label: "Leader", value: 3 },
          { label: "Rival B", value: 1 },
          { label: "Niche brand", value: -1 },
          { label: "Our brand", value: -6, highlight: true },
        ],
      },
    ],
    keyMetrics: [
      { name: "Share of voice", formula: "Our category media spend (or impressions) ÷ total category media spend", meaning: "How much of the category's advertising presence is yours." },
      { name: "Share of market", formula: "Our category sales ÷ total category sales", meaning: "Your commercial position in the same market definition." },
      { name: "Excess share of voice", formula: "SOV − SOM (percentage points)", meaning: "Positive suggests growth pressure, negative suggests likely erosion." },
      { name: "Impression share", formula: "Impressions received ÷ eligible impressions", meaning: "A channel-level SOV proxy for search and some auction platforms." },
    ],
    pitfalls: [
      "Using different market definitions for SOV and SOM.",
      "Treating the ESOV relationship as a law rather than an average tendency that varies by category.",
      "Relying on a single, incomplete spend source, especially for digital media.",
      "Ignoring creative quality and distribution, which change how much share a given ESOV delivers.",
      "Cutting spend to harvest profit without modelling the delayed share loss.",
    ],
    related: ["brand-funnel", "mmm", "competitive", "paid-efficiency"],
  },

  /* ------------------------------------------------------------------ */
  "price-elasticity": {
    overview: [
      "Price elasticity measures how much demand changes when price changes. An elasticity of −2 means a 1% price rise reduces volume by about 2%; an elasticity of −0.5 means volume barely moves. Promotion elasticity applies the same idea to temporary discounts, multi-buys and coupons.",
      "The concept comes from classical economics, but in marketing the practical questions are about profit, not volume: does a promotion create genuinely incremental sales, or does it just subsidise purchases that would have happened anyway, steal from your own products (cannibalisation) or pull purchases forward from future weeks?",
      "This framework answers: are we over- or under-priced, and do promotions create incremental profit? It turns price and promotion history into guardrails for list prices, discount depth and promotion frequency.",
    ],
    whenToUse: [
      "Promotions drive large spikes in volume but profit for the period is flat or down.",
      "Cost inflation forces a price review and you need to know how far you can move.",
      "Sales dip after every promotion, suggesting pull-forward or stockpiling.",
      "Different segments or regions seem to react very differently to price.",
      "A competitor changed price and you need to decide whether to follow.",
      "A large share of volume is now sold on promotion and full-price sales are shrinking.",
    ],
    howItWorks: [
      {
        step: "Build a price and volume dataset",
        detail: "Assemble weekly or daily sales by product and store or channel, with actual selling price, promotion flags and mechanics, competitor prices, distribution and seasonality markers. Elasticity estimates are only as good as the variation and controls in this data.",
      },
      {
        step: "Model base elasticity by segment",
        detail: "Use regression (often log-log, so coefficients read as elasticities) controlling for seasonality, distribution and competitor price. Estimate by product group, channel or customer segment, since averages hide very different sensitivities.",
      },
      {
        step: "Estimate promotion uplift and baseline",
        detail: "Model the baseline volume you would have sold without the promotion, then measure uplift as actual minus baseline. Where possible, use holdout stores, regions or customer groups to validate the model with a true counterfactual.",
      },
      {
        step: "Subtract cannibalisation and pull-forward",
        detail: "Check whether sister products dipped during the promotion and whether volume fell below baseline in the weeks after. Incremental volume = uplift − cannibalised volume − post-promotion dip.",
      },
      {
        step: "Convert to incremental profit",
        detail: "Multiply incremental units by promoted margin and subtract the discount given away on baseline units, plus any funding and display costs. Many promotions with impressive uplift turn out to be profit-negative at this step.",
      },
      {
        step: "Set price and promotion guardrails",
        detail: "Use elasticities to choose price moves that raise profit, a maximum discount depth, a minimum gap between promotions and a list of products that should rarely be discounted. Re-estimate periodically, because elasticity shifts with competition and inflation.",
      },
    ],
    plainWords:
      "Say your lemonade usually sells 20 cups a day at one pound. You try a half-price day and sell 50 cups, which feels great. But some of those 50 people would have paid full price anyway, some bought two and did not come back the next day, and some switched from your cookies to lemonade. When you count it all up you might have earned less money than a normal day. Elasticity is the careful counting that tells you which price and which deals really leave you better off.",
    examples: [
      {
        title: "Supermarket promotion that lost money",
        situation: "A grocer ran a monthly 33% off deal on a branded cereal that tripled weekly volume.",
        analysis: "Baseline was 1,000 units a week; promoted week sold 3,000. Cannibalisation from own-label and other cereals took about 700 units and the following two weeks fell 500 units below baseline, so true incremental volume was around 800. The discount on the 1,000 baseline units plus margin lost on cannibalised units outweighed the margin from 800 incremental units.",
        outcome: "The grocer moved to a shallower 20% discount every eight weeks, which cut uplift but turned the promotion profit-positive.",
      },
      {
        title: "Subscription streaming price rise",
        situation: "A streaming service needed to raise its monthly price by 10% to cover content costs.",
        analysis: "Historical tests and a regional price trial suggested churn elasticity of about −0.6 for long-tenure subscribers and −1.8 for subscribers in their first three months.",
        outcome: "The service raised prices for existing subscribers with notice, kept a lower introductory price for new ones, and revenue rose about 7% with churn staying within forecast.",
      },
      {
        title: "Quick-service restaurant value menu",
        situation: "A QSR chain considered cutting the price of its core burger to drive traffic.",
        analysis: "Store-level modelling found burger price elasticity of −1.1 but strong attachment of fries and drinks. Incremental transactions brought higher-margin add-ons, while cannibalisation of premium burgers was small.",
        outcome: "A modest price cut on the core burger alongside a meal bundle increased total profit per store in a 12-week test across 40 stores versus matched controls.",
      },
    ],
    visuals: [
      {
        type: "waterfall",
        title: "From promotion uplift to true incremental units",
        caption: "Headline uplift of 2,000 units shrinks to 800 once cannibalisation and post-promotion dip are removed.",
        unit: "units",
        items: [
          { label: "Gross uplift", value: 2000, total: true },
          { label: "Cannibalisation", value: -700 },
          { label: "Post-promo dip", value: -500 },
          { label: "Incremental units", value: 800, total: true },
        ],
      },
      {
        type: "line",
        title: "Weekly volume around a promotion",
        caption: "The spike is real, but the dip in the weeks after shows part of it was simply bought earlier.",
        xLabels: ["W-2", "W-1", "Promo", "W+1", "W+2", "W+3"],
        yLabel: "Units sold",
        series: [
          { name: "Actual", points: [1000, 980, 3000, 700, 800, 990] },
          { name: "Baseline", points: [1000, 1000, 1000, 1000, 1000, 1000] },
        ],
      },
    ],
    keyMetrics: [
      { name: "Price elasticity", formula: "% change in quantity ÷ % change in price", meaning: "How sensitive volume is to price; below −1 means revenue falls when price rises." },
      { name: "Promotion uplift", formula: "Actual promoted volume − baseline volume", meaning: "Gross extra volume during the promotion before adjustments." },
      { name: "Incremental volume", formula: "Uplift − cannibalised volume − post-promotion dip", meaning: "Volume that genuinely would not have happened without the promotion." },
      { name: "Incremental profit", formula: "Incremental units × promo margin − discount on baseline units − promo costs", meaning: "Whether the promotion made or lost money." },
      { name: "Promotional share of volume", formula: "Volume sold on promotion ÷ total volume", meaning: "Dependence on deals; high values often signal eroding price perception." },
    ],
    pitfalls: [
      "Judging promotions on uplift rather than incremental profit.",
      "Estimating elasticity without controlling for seasonality, distribution or competitor price.",
      "Using a single average elasticity for all customers, products and channels.",
      "Ignoring pull-forward and stockpiling, especially for storable goods.",
      "Training customers to wait for deals by promoting too often.",
    ],
    related: ["value-based-pricing", "competitive", "experimentation", "mmm"],
  },

  /* ------------------------------------------------------------------ */
  "value-based-pricing": {
    overview: [
      "Value-based pricing sets prices according to the value customers perceive and are willing to pay, rather than cost-plus or simply matching competitors. Packaging is its companion: deciding which features, limits and services go into which plan or tier so that each customer finds a plan that fits and pays in proportion to the value they get.",
      "Practitioners such as Simon-Kucher and writers like Madhavan Ramanujam ('Monetizing Innovation') have shaped modern practice. Common tools include the Van Westendorp price sensitivity meter, conjoint or MaxDiff studies, and the good/better/best tier structure. A central idea is the value metric: the unit you charge for, such as seats, transactions or usage, which should grow as customer value grows.",
      "The framework answers: does our packaging capture value and guide customers to the right plan? It is especially relevant to subscription and SaaS businesses, but applies equally to services, insurance and physical products sold in versions.",
    ],
    whenToUse: [
      "Most customers cluster in the cheapest plan, or the top plan is almost never chosen.",
      "Heavy users pay the same as light users, so revenue does not grow with usage.",
      "Sales teams discount heavily because list prices feel arbitrary to buyers.",
      "Free or entry tiers are so generous that few users upgrade.",
      "You are launching a new product or plan and have no price reference.",
    ],
    howItWorks: [
      {
        step: "Identify the value metric",
        detail: "Find the unit that best tracks the value a customer receives, such as active users, contacts, transactions processed or locations. A good value metric is easy to understand, predictable for the buyer and grows as the customer succeeds.",
      },
      {
        step: "Segment customers by needs and value",
        detail: "Use usage data and interviews to group customers by what they use and why. Typically a small set of segments (for example solo users, growing teams and enterprises) have distinctly different needs and budgets.",
      },
      {
        step: "Research willingness to pay",
        detail: "Run Van Westendorp questions (too cheap, a bargain, getting expensive, too expensive) for a range, and conjoint or MaxDiff to see which features drive choice. Classify features as leaders (drive purchase), fillers (nice to have) and killers (actively unwanted at a price).",
      },
      {
        step: "Design good/better/best tiers",
        detail: "Build each tier around a target segment, place leader features where they create clear upgrade reasons and scale limits on the value metric. Price gaps between tiers should reflect value differences, and the middle tier is often designed to be the natural choice.",
      },
      {
        step: "Test with cohorts",
        detail: "Introduce the new packaging to a share of new visitors or regions, comparing conversion, plan mix, average revenue per account and early retention against the existing offer. Grandfather existing customers or migrate them with care and notice.",
      },
      {
        step: "Monitor and iterate",
        detail: "Track plan mix, upgrade and downgrade flows, discounting and expansion revenue. Revisit packaging at least yearly as the product and the market change.",
      },
    ],
    plainWords:
      "Think of a cinema. Some people just want a seat, some want a better seat with popcorn, and some want a sofa and a drink brought to them. If the cinema charged everyone the same, it would either lose people who want the cheap option or give away the sofa for nothing. Value-based pricing means working out what each kind of film-goer actually cares about and how much it is worth to them, then building a few clear options so everyone picks one that suits them.",
    examples: [
      {
        title: "SaaS: switching to a usage-based value metric",
        situation: "An email marketing platform charged a flat price per seat, but value came mainly from the number of contacts emailed. Large senders with one seat paid very little.",
        analysis: "Usage analysis showed revenue per contact varied twentyfold across accounts. Willingness-to-pay research confirmed buyers accepted contact-based tiers as fair because cost scaled with their audience.",
        outcome: "Moving to contact-based tiers with seats included raised average revenue per account by about 18% in new cohorts, with no measurable fall in conversion.",
      },
      {
        title: "Airline fare families",
        situation: "An airline sold a single economy fare and lost price-sensitive travellers to low-cost carriers while giving flexibility to everyone for free.",
        analysis: "Research showed business travellers valued flexibility and seat choice highly, while leisure travellers were mainly price-led. Bags, changes and seat selection were leader features for different segments.",
        outcome: "Three fare families (light, standard, flex) let the airline match low-cost fares with the light option while capturing more revenue from travellers who valued flexibility.",
      },
      {
        title: "Telecom broadband tiers",
        situation: "A broadband provider's top speed tier was chosen by under 3% of customers.",
        analysis: "Van Westendorp results showed the top tier was priced above the 'too expensive' point for most households, and the speed difference was not a leader feature for them. Whole-home Wi-Fi coverage was valued more.",
        outcome: "Bundling mesh Wi-Fi into the middle tier and narrowing the price gap shifted plan mix upwards, raising average revenue per user by around 6%.",
      },
    ],
    visuals: [
      {
        type: "bars",
        title: "Plan mix before and after repackaging",
        caption: "A well-designed middle tier becomes the natural choice and pulls customers up from the entry plan.",
        unit: "%",
        items: [
          { label: "Basic (before)", value: 68 },
          { label: "Pro (before)", value: 27 },
          { label: "Business (before)", value: 5 },
          { label: "Basic (after)", value: 41 },
          { label: "Pro (after)", value: 49, highlight: true },
          { label: "Business (after)", value: 10 },
        ],
      },
      {
        type: "matrix",
        title: "Feature classification for packaging",
        caption: "Features that are highly valued by many go in every tier or drive upgrades; niche high-value features belong in the top tier.",
        xLabel: "Share of customers who value it",
        yLabel: "Willingness to pay for it",
        quadrants: ["Premium tier differentiator", "Core leader: anchor the tiers", "Leave out or add-on", "Include in base as filler"],
        points: [
          { label: "SSO and audit log", x: 18, y: 80 },
          { label: "Automation", x: 72, y: 76 },
          { label: "Templates", x: 80, y: 30 },
          { label: "Custom fonts", x: 15, y: 15 },
          { label: "Integrations", x: 60, y: 60 },
        ],
      },
    ],
    keyMetrics: [
      { name: "Average revenue per account (ARPA)", formula: "Recurring revenue ÷ paying accounts", meaning: "Whether packaging is capturing more value per customer." },
      { name: "Plan mix", formula: "Accounts on each plan ÷ total accounts", meaning: "Whether customers choose the tiers you designed them to choose." },
      { name: "Upgrade rate", formula: "Accounts moving to a higher tier in period ÷ accounts eligible", meaning: "Whether tiers create clear reasons to grow with you." },
      { name: "Discount rate", formula: "1 − (net price ÷ list price)", meaning: "High discounting suggests list prices or packaging do not reflect perceived value." },
      { name: "Net revenue retention", formula: "(Start MRR + expansion − contraction − churn) ÷ start MRR", meaning: "Whether the value metric lets revenue grow with existing customers." },
    ],
    pitfalls: [
      "Choosing a value metric that is easy to bill but does not track customer value.",
      "Too many tiers or add-ons, which slows the decision and increases sales friction.",
      "Relying on stated willingness to pay without validating through live tests.",
      "Putting every leader feature in the top tier, leaving the entry tier without enough value to convert.",
      "Changing prices for existing customers without notice, damaging trust and retention.",
    ],
    related: ["price-elasticity", "stp", "jtbd", "clv"],
  },

  /* ------------------------------------------------------------------ */
  "b2b-funnel": {
    overview: [
      "The B2B demand waterfall maps how raw demand turns into revenue: inquiries become marketing-qualified leads (MQLs), then sales-accepted and sales-qualified leads (SALs and SQLs), then opportunities, and finally closed-won deals. By measuring volume, conversion and time at each stage, it shows where pipeline is being lost.",
      "The model was popularised by SiriusDecisions (now part of Forrester) in the mid-2000s and has since been revised to focus more on buying groups and opportunities rather than individual leads. Whatever the exact stage names, the logic is the same: revenue = volume × conversion at each stage, delivered over a certain cycle time.",
      "The waterfall answers: is the pipeline problem volume, quality, conversion or velocity? It stops teams arguing about 'not enough leads' or 'bad leads' by putting numbers on each stage, by source and over time.",
    ],
    whenToUse: [
      "Marketing hits its MQL target but sales says pipeline is thin.",
      "Bookings are behind plan and the team cannot agree whether to buy more leads or improve conversion.",
      "Win rates or average deal sizes have shifted and you need to see where.",
      "Sales cycles are lengthening and forecasts keep slipping.",
      "Stage definitions or lead routing changed recently and reports no longer seem to add up.",
    ],
    howItWorks: [
      {
        step: "Agree stage definitions",
        detail: "Write explicit entry criteria for each stage (for example, an SQL has budget, need and a meeting booked) and who owns the transition. Without shared definitions, conversion rates are not comparable across teams or periods.",
      },
      {
        step: "Reconstruct the waterfall by source",
        detail: "Use CRM stage history to count how many records entered each stage in a period, split by lead source, segment and region. Track cohorts from creation date so you can see the eventual conversion of a given month's leads.",
      },
      {
        step: "Compare stage conversion and velocity",
        detail: "Calculate conversion from each stage to the next and the median days spent in each stage. Compare against prior periods and across sources to find stages where conversion has dropped or time has grown.",
      },
      {
        step: "Check for definition drift and data issues",
        detail: "Look for sudden jumps that coincide with scoring changes, new routing rules, CRM migrations or changed sales incentives. Many apparent conversion problems are actually changes in what is being counted.",
      },
      {
        step: "Identify the binding constraint",
        detail: "Work backwards from the bookings target: how many deals, opportunities and SQLs are needed at current rates? The stage where the gap between required and actual is biggest, relative to what can realistically change, is the constraint.",
      },
      {
        step: "Fix the constraint and rebalance",
        detail: "If volume is short, invest in the sources with the best downstream conversion, not the cheapest leads. If conversion or velocity is the problem, fix qualification, handoff speed, sales process or offer before adding more volume.",
      },
    ],
    plainWords:
      "Imagine a football club's academy. Lots of players turn up to open trials, some are invited back, a few join the youth team, and only a couple make the first team. If the first team is short of players, the coach needs to know whether too few people came to trials, or whether good players are being dropped at one of the later steps. The waterfall counts players at every step so you fix the right one.",
    examples: [
      {
        title: "SaaS: MQL target hit, pipeline missed",
        situation: "A SaaS vendor grew MQLs 40% year on year by gating more content, but opportunities grew only 5%.",
        analysis: "By source, content-download MQLs converted to SQL at 4% versus 22% for demo requests. The overall MQL→SQL rate had halved because the mix had shifted towards low-intent leads.",
        outcome: "Marketing changed its target from MQL volume to pipeline created, reduced gated-content spend and invested in demo-driving campaigns, raising opportunities by 20% with fewer MQLs.",
      },
      {
        title: "Industrial equipment: velocity problem",
        situation: "A manufacturer's win rate was stable, but quarterly bookings were missing forecast.",
        analysis: "Median days from opportunity to close had risen from 95 to 140, mainly in the proposal stage, after a new pricing approval process was introduced.",
        outcome: "Pre-approved pricing bands for standard configurations cut proposal-stage time by a month and brought bookings back in line with forecast.",
      },
      {
        title: "Business bank: definition drift",
        situation: "A bank's SME lending team saw SQL→opportunity conversion jump from 30% to 55% in one quarter.",
        analysis: "Investigation showed a CRM update had stopped creating SQL records for inbound phone inquiries, which converted poorly; the improvement was a counting artefact.",
        outcome: "Restoring consistent stage creation rules avoided a mistaken shift of budget towards phone-based campaigns.",
      },
    ],
    visuals: [
      {
        type: "funnel",
        title: "Quarterly demand waterfall",
        caption: "The largest proportional loss is between MQL and SQL, which points to lead quality or handoff rather than raw volume.",
        stages: [
          { label: "Inquiries", value: 10000 },
          { label: "MQL", value: 3000 },
          { label: "SQL", value: 450 },
          { label: "Opportunity", value: 270 },
          { label: "Closed-won", value: 68 },
        ],
      },
      {
        type: "bars",
        title: "MQL → SQL conversion by source",
        caption: "Sources with plenty of cheap MQLs can still be the weakest contributors to pipeline.",
        unit: "%",
        items: [
          { label: "Demo request", value: 22 },
          { label: "Referral", value: 19 },
          { label: "Webinar", value: 11 },
          { label: "Paid social", value: 7 },
          { label: "Content download", value: 4, highlight: true },
        ],
      },
    ],
    keyMetrics: [
      { name: "Stage conversion", formula: "Records reaching stage n+1 ÷ records entering stage n (by cohort)", meaning: "Where leads are lost; track by source and segment." },
      { name: "Win rate", formula: "Closed-won ÷ (closed-won + closed-lost)", meaning: "How effectively qualified opportunities become customers." },
      { name: "Sales velocity", formula: "Opportunities × win rate × average deal size ÷ cycle length (days)", meaning: "Revenue generated per day; combines the four pipeline levers." },
      { name: "Pipeline coverage", formula: "Open pipeline value ÷ remaining bookings target", meaning: "Whether there is enough pipeline to hit the target at current win rates." },
      { name: "Cost per opportunity", formula: "Marketing spend ÷ opportunities created", meaning: "A better efficiency measure than cost per lead." },
    ],
    pitfalls: [
      "Setting marketing targets on MQL volume, which rewards low-quality leads.",
      "Comparing conversion across periods while stage definitions or routing have changed.",
      "Measuring conversion from snapshots rather than cohorts, which mixes leads of different ages.",
      "Ignoring velocity, so pipeline that will close too late looks healthy.",
      "Treating each lead in isolation when B2B purchases are made by buying groups.",
    ],
    related: ["lead-scoring", "abm", "funnel", "attribution"],
  },

  /* ------------------------------------------------------------------ */
  "lead-scoring": {
    overview: [
      "Lead scoring ranks leads by how likely they are to become customers, so sales teams spend their time on the best ones and marketing nurtures the rest. A robust model combines two dimensions: fit (does this company and person match our ideal customer profile?) and intent or engagement (are they showing signs of an active buying process?).",
      "Scoring only works if both teams trust it, which is why it is paired with sales–marketing alignment: shared definitions of qualified leads, service-level agreements (SLAs) on how fast sales follows up, and a feedback loop where sales outcomes recalibrate the model. Early models were hand-built points tables; many teams now use predictive models trained on closed-won data.",
      "The framework answers: are the right leads reaching sales at the right time? It addresses both quality (are we passing the right leads?) and timing (do we pass them while they are still active, and does sales act quickly?).",
    ],
    whenToUse: [
      "Sales ignores marketing leads or says most of them are poor quality.",
      "Lead follow-up times are long or inconsistent across reps.",
      "High-fit accounts are being nurtured by email for months while they are already talking to competitors.",
      "Inbound volume has grown faster than sales capacity and reps need to prioritise.",
      "The existing scoring model was built years ago and nobody knows if it predicts anything.",
    ],
    howItWorks: [
      {
        step: "Define the ideal customer profile and fit score",
        detail: "Analyse closed-won and high-retention customers to find the firmographics that matter: industry, company size, region, technology used, job function and seniority. Score fit separately so a perfect-fit account with low activity is not lost.",
      },
      {
        step: "Add a behavioural and intent score",
        detail: "Weight actions by how strongly they signal buying intent: a pricing page visit or demo request should count far more than a blog read. Include third-party intent data where available and decay scores over time so old activity fades.",
      },
      {
        step: "Combine into a routing grid",
        detail: "Use a two-dimensional grid (for example A–D for fit and 1–4 for intent) rather than a single number. High fit and high intent go straight to sales; high fit with low intent gets targeted nurture or account-based plays; low fit is deprioritised regardless of activity.",
      },
      {
        step: "Calibrate against outcomes",
        detail: "Check how each score band converts to opportunity and closed-won over a period. Adjust weights or thresholds until conversion rises clearly from band to band; a model where top-band leads convert little better than average is not working.",
      },
      {
        step: "Agree SLAs and the handoff",
        detail: "Document what a marketing-qualified lead is, how quickly sales must make contact (for example within one business day), how many attempts are expected and when a lead can be returned to nurture. Measure adherence and report it to both teams.",
      },
      {
        step: "Close the feedback loop",
        detail: "Require reasons when sales rejects or disqualifies a lead, and review rejection reasons and conversion monthly together. Use this feedback to recalibrate the model at least quarterly.",
      },
    ],
    plainWords:
      "Imagine a football coach watching hundreds of players at a trial day. Some are the right age and build for the team (that is fit), and some are running hard and asking about joining (that is interest). The coach wants to talk first to players who have both, and to talk to them quickly before another club does. Lead scoring is a simple way of sorting players like that, and then checking later whether the ones picked actually turned out to be good.",
    examples: [
      {
        title: "SaaS: rebuilding trust in MQLs",
        situation: "A software company's sales team accepted only 30% of MQLs and follow-up times averaged four days.",
        analysis: "A points model gave equal weight to webinar attendance and pricing page visits. Calibration against a year of outcomes showed pricing and demo activity from director-level contacts at 200+ employee companies converted eight times better than average.",
        outcome: "A fit × intent grid and a one-day SLA raised sales acceptance to 65%, and MQL-to-opportunity conversion roughly doubled within two quarters.",
      },
      {
        title: "Commercial insurance broker",
        situation: "A broker received many web quote requests and could not respond to all of them quickly.",
        analysis: "Fit was driven by industry risk class and premium size; intent by renewal date proximity and quote completeness. Leads with renewal within 60 days and complete details converted at 25% versus 5% for the rest.",
        outcome: "Routing these leads to senior brokers within two hours, and the rest to an automated nurture, increased bound policies by 15% with the same headcount.",
      },
      {
        title: "Logistics provider using intent data",
        situation: "A logistics firm's high-fit target accounts showed little website engagement, so they never became MQLs.",
        analysis: "Third-party intent data showed several of these accounts researching freight topics heavily. Adding account-level intent to the fit score surfaced them.",
        outcome: "Sales development outreach to high-fit, high-intent accounts produced a meeting rate three times higher than generic outbound.",
      },
    ],
    visuals: [
      {
        type: "matrix",
        title: "Fit × intent routing grid",
        caption: "Only high-fit, high-intent leads go straight to sales; high-fit, low-intent accounts need nurture, not neglect.",
        xLabel: "Intent / engagement score",
        yLabel: "Fit score",
        quadrants: ["Nurture and ABM: right company, not ready", "Route to sales now", "Deprioritise", "Check fit: active but off-profile"],
        points: [
          { label: "Lead A", x: 85, y: 88 },
          { label: "Lead B", x: 25, y: 80 },
          { label: "Lead C", x: 78, y: 22 },
          { label: "Lead D", x: 15, y: 18 },
          { label: "Lead E", x: 62, y: 70 },
        ],
      },
      {
        type: "bars",
        title: "Opportunity conversion by score band",
        caption: "A well-calibrated model shows a steep step up from band to band; a flat profile means the score is not predictive.",
        unit: "%",
        items: [
          { label: "Band D", value: 1 },
          { label: "Band C", value: 4 },
          { label: "Band B", value: 11 },
          { label: "Band A", value: 28, highlight: true },
        ],
      },
    ],
    keyMetrics: [
      { name: "Sales acceptance rate", formula: "Leads accepted by sales ÷ leads passed", meaning: "Whether sales trusts and agrees with the qualified-lead definition." },
      { name: "Speed to lead", formula: "Median time from MQL to first sales contact", meaning: "Whether SLAs are being met; conversion often falls as delay grows." },
      { name: "Conversion by score band", formula: "Opportunities from band ÷ leads in band", meaning: "Whether the model actually separates good leads from poor ones." },
      { name: "SLA adherence", formula: "Leads contacted within SLA ÷ leads routed", meaning: "Discipline of the handoff on the sales side." },
      { name: "Lift of top band", formula: "Top-band conversion ÷ average conversion", meaning: "How much better than random the model performs at the top." },
    ],
    pitfalls: [
      "Blending fit and intent into one number, so active students and perfect-fit but quiet accounts look similar.",
      "Over-weighting easy-to-count activity such as email opens and content downloads.",
      "Never recalibrating the model against closed-won outcomes.",
      "Launching scoring without SLAs, so better leads still wait days for follow-up.",
      "Scoring individuals only and ignoring that several people from the same account may be engaging.",
    ],
    related: ["b2b-funnel", "abm", "next-best-action", "attribution"],
  },

  /* ------------------------------------------------------------------ */
  abm: {
    overview: [
      "Account-based marketing (ABM) concentrates marketing and sales effort on a defined list of high-value target accounts, treating each account (or small group of similar accounts) as a market of one. Rather than generating as many leads as possible and filtering them, ABM starts with the accounts you most want to win and builds coordinated plays to engage the people who make the buying decision.",
      "The term was popularised by ITSMA in the early 2000s, which described three levels: one-to-one (strategic ABM for a handful of accounts), one-to-few (clusters of similar accounts) and one-to-many (programmatic ABM using technology at scale). Modern ABM also draws on the idea of the buying committee: in large B2B purchases, several stakeholders with different concerns influence the decision.",
      "ABM answers: are we winning the accounts that matter most? Success is measured at account level: coverage of the buying committee, engagement, progression through stages, pipeline and revenue from target accounts.",
    ],
    whenToUse: [
      "A small number of large accounts make up most of potential revenue, so lead volume metrics are misleading.",
      "Deals involve buying committees of several people and long cycles.",
      "Sales is already pursuing named accounts and marketing activity is disconnected from that list.",
      "You want to expand within existing customers through cross-sell or new divisions.",
      "Lead-based programmes generate many contacts from companies sales would never pursue.",
    ],
    howItWorks: [
      {
        step: "Select and tier accounts",
        detail: "Build the list jointly with sales using fit (ideal customer profile), potential value, intent signals and existing relationships. Assign tiers, for example 10–20 tier 1 accounts for one-to-one plays, 50–200 tier 2 for one-to-few, and a larger tier 3 for programmatic activity.",
      },
      {
        step: "Map buying committees",
        detail: "For each target account, identify the roles involved in the decision: economic buyer, champion, technical evaluator, users and procurement. Record known contacts and gaps; coverage of key roles is often the earliest predictor of success.",
      },
      {
        step: "Build account insight",
        detail: "Gather what matters to each account or cluster: strategic priorities, recent news, technology stack, current suppliers and pain points. For tier 1 accounts this becomes a written account plan shared between sales and marketing.",
      },
      {
        step: "Design 1:1, 1:few and 1:many plays",
        detail: "Plays combine channels in a coordinated sequence, such as tailored content, targeted advertising to the account, executive events, direct mail and sales outreach. Personalisation depth should match the tier: bespoke for tier 1, industry or use-case level for tier 2, light-touch for tier 3.",
      },
      {
        step: "Orchestrate with sales",
        detail: "Agree who does what and when for each account, and hold regular account reviews. Engagement signals from marketing should trigger sales actions, and sales intelligence should shape the next marketing touch.",
      },
      {
        step: "Measure account progression",
        detail: "Track accounts through stages such as aware, engaged, opportunity, customer and expanded. Compare target accounts with a similar control group on engagement, pipeline, win rate and deal size to estimate ABM's real impact.",
      },
    ],
    plainWords:
      "Think of a football club that wants to sign three particular star players, rather than putting up posters hoping anyone good turns up. The club learns everything about each player, finds out who influences their decision (their agent, their family, their current coach) and plans a careful approach for each one. ABM is the same idea: pick the few customers that matter most and win them on purpose, with everyone on your side working together.",
    examples: [
      {
        title: "Enterprise SaaS: 1:1 programme for tier 1 accounts",
        situation: "A cybersecurity vendor wanted to break into 15 large banks where it had little presence.",
        analysis: "Buying committee mapping showed the vendor knew security engineers but had no contact with chief risk officers or procurement. Account research highlighted regulatory audit deadlines at several banks.",
        outcome: "Tailored briefings on audit readiness for risk leaders and executive roundtables led to opportunities at 6 of the 15 banks within a year, against 1 of 15 in a comparable control group.",
      },
      {
        title: "Professional services: 1:few by industry cluster",
        situation: "A consulting firm targeted 120 mid-sized manufacturers.",
        analysis: "Accounts were clustered into three sub-sectors with distinct challenges: energy costs, supply chain resilience and automation. Each cluster received a tailored research report, webinar series and targeted ads.",
        outcome: "Target accounts showed double the meeting rate of non-target accounts, and average deal size was 30% higher because engagement started at more senior levels.",
      },
      {
        title: "Telecom business division: expansion ABM",
        situation: "A telecom provider supplied connectivity to many large firms but rarely sold its cloud and security services to them.",
        analysis: "Existing customer accounts were scored on cross-sell potential, and buying committees for cloud services (IT and security leaders) were mapped, since they differed from the connectivity buyers.",
        outcome: "A coordinated expansion programme with account managers raised cross-sell pipeline from target customers by about 40% over the year.",
      },
    ],
    visuals: [
      {
        type: "funnel",
        title: "Target account progression (tier 1 and 2)",
        caption: "ABM is measured in accounts, not leads; the key question is how many target accounts move to the next stage each quarter.",
        stages: [
          { label: "Target accounts", value: 150 },
          { label: "Aware", value: 120 },
          { label: "Engaged", value: 72 },
          { label: "Opportunity", value: 30 },
          { label: "Customer", value: 12 },
        ],
      },
      {
        type: "cycle",
        title: "ABM operating cycle",
        caption: "ABM is a repeating loop in which progression data feeds back into account selection and the next set of plays.",
        steps: ["Select and tier accounts", "Map buying committee", "Build account insight", "Run coordinated plays", "Measure progression", "Review with sales and re-tier"],
      },
    ],
    keyMetrics: [
      { name: "Buying committee coverage", formula: "Key roles with an engaged contact ÷ key roles identified", meaning: "Whether you are reaching all the people who influence the decision." },
      { name: "Account engagement rate", formula: "Target accounts with meaningful engagement ÷ target accounts", meaning: "Whether plays are reaching and interesting the chosen accounts." },
      { name: "Account progression rate", formula: "Accounts moving up a stage in period ÷ accounts in prior stage", meaning: "Momentum through the account journey." },
      { name: "Pipeline from target accounts", formula: "Opportunity value created at target accounts", meaning: "The commercial output ABM should drive." },
      { name: "Win rate and deal size vs control", formula: "Target account win rate or deal size ÷ comparable non-target value", meaning: "The incremental effect of ABM rather than simply picking good accounts." },
    ],
    pitfalls: [
      "Choosing the account list without sales, so plays target accounts sales is not pursuing.",
      "Measuring ABM with lead metrics such as MQL volume or cost per lead.",
      "Engaging only one contact per account and ignoring the wider buying committee.",
      "Claiming success without a control group, when target accounts were chosen because they were already likely to buy.",
      "Spreading 1:1 effort over too many accounts, so personalisation becomes superficial.",
    ],
    related: ["b2b-funnel", "lead-scoring", "stp", "clv"],
  },

  /* ------------------------------------------------------------------ */
  "paid-efficiency": {
    overview: [
      "Paid media efficiency breaks overall paid performance into the drivers that produce it. Return on ad spend (ROAS) can be written as a chain: the cost of reaching people (CPM), the share who click (CTR), the share of clickers who convert (CVR) and the value of each conversion (AOV). ROAS = CTR × CVR × AOV × 1,000 ÷ CPM. When ROAS falls, the decomposition shows which link broke.",
      "Platform ROAS and cost per acquisition (CPA) are based on the platforms' own attribution, which tends to over-credit them. Marketing efficiency ratio (MER), total revenue divided by total marketing spend, provides a blended, platform-independent sanity check, and CAC by channel links paid activity to customer acquisition and lifetime value.",
      "The framework answers: which component of the paid funnel is degrading, and where? It replaces vague diagnoses such as 'the algorithm stopped working' with specific findings like 'CPMs rose 30% in prospecting audiences while CVR held steady'.",
    ],
    whenToUse: [
      "ROAS or CPA has worsened and nobody can say why.",
      "Platform-reported results look healthy but total revenue is not growing with spend.",
      "Scaling budget leads to sharply diminishing returns in one channel.",
      "You need to decide whether to refresh creative, change audiences, fix the landing page or rebalance channels.",
      "Seasonal auctions, privacy changes or a new competitor may be affecting costs.",
    ],
    howItWorks: [
      {
        step: "Decompose ROAS into drivers",
        detail: "For each channel and campaign, compute CPM, CTR, CVR (conversions ÷ clicks) and AOV (revenue ÷ conversions). Check that the components multiply back to reported ROAS, which confirms the data is consistent.",
      },
      {
        step: "Trend each driver",
        detail: "Plot each driver weekly over at least 12 weeks and compare with the same period last year. A rising CPM points to auction or targeting pressure, falling CTR to creative fatigue or poor relevance, falling CVR to landing page, offer or traffic quality, and falling AOV to mix or discounting.",
      },
      {
        step: "Isolate channel, audience and creative effects",
        detail: "Cut the same metrics by channel, prospecting versus retargeting, audience and creative. Often one segment drives the decline, such as a single fatigued creative or an audience that has been saturated by frequency.",
      },
      {
        step: "Cross-check with MER and incrementality",
        detail: "Compare platform ROAS with blended MER and with new-customer CAC. Where platform results and blended results diverge, use holdout tests, geo experiments or MMM to understand the real incremental contribution.",
      },
      {
        step: "Map marginal returns",
        detail: "Look at how ROAS or CPA changes as spend increases in each channel or campaign. Budget should go where the next unit of spend earns the most, not where the average ROAS is highest.",
      },
      {
        step: "Reallocate and refresh",
        detail: "Move budget from saturated or low-marginal-return lines towards better ones, refresh fatigued creative, fix conversion leaks on landing pages and revisit bids and targeting. Set a regular review rhythm so drivers are checked before ROAS falls far.",
      },
    ],
    plainWords:
      "Imagine you hand out flyers for your lemonade stand. How much the flyers cost, how many people read them, how many of those readers walk over and buy, and how much each one buys all add up to whether the flyers paid off. If you suddenly earn less, you need to check each of those four things one by one, rather than just saying 'flyers don't work any more'. That is what this framework does for online adverts.",
    examples: [
      {
        title: "E-commerce: ROAS drop was really a CPM rise",
        situation: "A home goods retailer's social ROAS fell from 4.0 to 3.0 over a quarter.",
        analysis: "Decomposition showed CTR at 1.2% and CVR at 2.5% were stable, and AOV was steady at 80, but CPM had risen from 9.60 to 12.80. The increase was concentrated in broad prospecting audiences during a peak season auction.",
        outcome: "Shifting part of the budget into search and email over the peak weeks and holding prospecting spend until CPMs eased protected blended MER, with no creative or site changes needed.",
      },
      {
        title: "Travel: conversion leak behind the ads",
        situation: "An online travel agency saw search CPA rise 35% in two months.",
        analysis: "CPM and CTR were steady, but CVR on mobile fell from 3.0% to 2.0% after a checkout redesign. Desktop CVR was unchanged.",
        outcome: "Reverting a mobile payment step restored CVR and CPA; the media budget had been about to be cut for a problem that was not in the media.",
      },
      {
        title: "Subscription app: platform ROAS versus MER",
        situation: "A meditation app reported platform ROAS above target on social ads, but total subscription revenue had stalled while spend rose 50%.",
        analysis: "MER fell from 2.8 to 2.0. A geo holdout test found that only about 40% of platform-attributed conversions were incremental, particularly in retargeting, which mostly reached existing visitors.",
        outcome: "Retargeting spend was cut by 60% and reinvested in prospecting and creator partnerships, raising MER back to 2.5.",
      },
    ],
    visuals: [
      {
        type: "waterfall",
        title: "ROAS bridge: last quarter to this quarter",
        caption: "Almost all of the ROAS decline comes from rising CPMs; click-through, conversion and order value barely moved.",
        unit: "ROAS",
        items: [
          { label: "Last quarter ROAS", value: 4.0, total: true },
          { label: "CPM change", value: -1.0 },
          { label: "CTR change", value: -0.1 },
          { label: "CVR change", value: 0.05 },
          { label: "AOV change", value: 0.05 },
          { label: "This quarter ROAS", value: 3.0, total: true },
        ],
      },
      {
        type: "line",
        title: "Driver trend, indexed to week 1",
        caption: "When one line breaks away from the others, that driver is the cause; here CPM rises while CTR and CVR stay flat.",
        xLabels: ["W1", "W3", "W5", "W7", "W9", "W11"],
        yLabel: "Index (week 1 = 100)",
        series: [
          { name: "CPM", points: [100, 104, 110, 118, 127, 133] },
          { name: "CTR", points: [100, 99, 101, 98, 97, 98] },
          { name: "CVR", points: [100, 101, 100, 102, 101, 101] },
        ],
      },
    ],
    keyMetrics: [
      { name: "ROAS", formula: "Attributed revenue ÷ ad spend = CTR × CVR × AOV × 1,000 ÷ CPM", meaning: "Revenue per unit of spend; decomposes into the four drivers." },
      { name: "Marketing efficiency ratio (MER)", formula: "Total revenue ÷ total marketing spend", meaning: "Blended, attribution-independent check on whether spend is paying off." },
      { name: "CPA / CAC", formula: "Spend ÷ conversions (or new customers)", meaning: "Cost of each acquisition; compare with CLV, not just with targets." },
      { name: "CPM", formula: "Spend ÷ impressions × 1,000", meaning: "Cost of reach; rises with auction pressure and narrow targeting." },
      { name: "Marginal ROAS", formula: "Δ revenue ÷ Δ spend between budget levels", meaning: "Return on the next unit of spend; the right basis for reallocation." },
    ],
    pitfalls: [
      "Treating platform-attributed ROAS as incremental, especially for retargeting and branded search.",
      "Looking only at total ROAS instead of the drivers, so the wrong fix is applied.",
      "Allocating budget by average ROAS rather than marginal returns.",
      "Optimising to cheap conversions that bring low-value customers, ignoring CLV.",
      "Reacting to day-to-day noise rather than trends over several weeks.",
    ],
    related: ["cac", "creative-testing", "mmm", "attribution"],
  },
};
