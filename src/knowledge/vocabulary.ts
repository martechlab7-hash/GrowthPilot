/**
 * Industry vocabulary and problem-statement parsing, so interview questions
 * read in the client's own terms ("passengers", "bookings", "repeat bookings")
 * instead of generic placeholders ("customers", "purchases", "the metric").
 */
export interface Vocabulary {
  customer: string;
  customers: string;
  /** Verb phrase used after "a typical {customer}", e.g. "book". */
  purchaseVerb: string;
  /** Noun used for one transaction, e.g. "booking". */
  purchase: string;
}

const DEFAULT: Vocabulary = { customer: "customer", customers: "customers", purchaseVerb: "purchase", purchase: "order" };

const BY_INDUSTRY: Record<string, Vocabulary> = {
  airline: { customer: "passenger", customers: "passengers", purchaseVerb: "book a flight", purchase: "booking" },
  hospitality: { customer: "guest", customers: "guests", purchaseVerb: "book a stay", purchase: "booking" },
  travel: { customer: "traveller", customers: "travellers", purchaseVerb: "book", purchase: "booking" },
  banking: { customer: "customer", customers: "customers", purchaseVerb: "transact", purchase: "transaction" },
  insurance: { customer: "policyholder", customers: "policyholders", purchaseVerb: "buy or renew a policy", purchase: "policy" },
  retail: { customer: "shopper", customers: "shoppers", purchaseVerb: "shop", purchase: "basket" },
  ecommerce: { customer: "shopper", customers: "shoppers", purchaseVerb: "order", purchase: "order" },
  telecom: { customer: "subscriber", customers: "subscribers", purchaseVerb: "top up or upgrade", purchase: "plan" },
  saas: { customer: "account", customers: "accounts", purchaseVerb: "expand or renew", purchase: "subscription" },
  media: { customer: "subscriber", customers: "subscribers", purchaseVerb: "watch or read", purchase: "subscription" },
  qsr: { customer: "guest", customers: "guests", purchaseVerb: "order", purchase: "order" },
  gaming: { customer: "player", customers: "players", purchaseVerb: "play", purchase: "purchase" },
  education: { customer: "learner", customers: "learners", purchaseVerb: "enrol", purchase: "enrolment" },
  healthcare: { customer: "patient", customers: "patients", purchaseVerb: "visit", purchase: "appointment" },
  real_estate: { customer: "buyer", customers: "buyers", purchaseVerb: "enquire", purchase: "deal" },
  automotive: { customer: "owner", customers: "owners and buyers", purchaseVerb: "buy or service a vehicle", purchase: "sale" },
  cpg: { customer: "shopper", customers: "shoppers", purchaseVerb: "buy", purchase: "purchase" },
  b2b_services: { customer: "account", customers: "accounts", purchaseVerb: "order", purchase: "deal" },
};

export function vocabularyFor(industryId: string | undefined): Vocabulary {
  return (industryId && BY_INDUSTRY[industryId]) || DEFAULT;
}

const STOP = new Set(["our", "the", "a", "an", "my", "their", "its", "of", "in", "and", "we", "have", "has", "been", "seen"]);
const TAIL = "(?=\\s+(?:over|in|since|for|by|from|across|during|this|last|after|because|and|which|while|at|on|to|year|month|quarter)\\b|[,.;:!?)]|$)";

/**
 * The metric the client is worried about, pulled from the problem statement
 * ("decline in repeat bookings over 12 months" → "repeat bookings").
 */
export function metricFromStatement(statement: string): string | undefined {
  const s = statement.replace(/\s+/g, " ").trim();
  const patterns = [
    new RegExp(`(?:decline|drop|fall|decrease|reduction|dip|slump|slowdown|loss|plateau|stagnation)\\s+(?:in|of)\\s+([a-z][a-z0-9 \\-/&%]{2,48}?)${TAIL}`, "i"),
    new RegExp(`(?:low|poor|falling|declining|dropping|weak|stagnant|flat)\\s+([a-z][a-z0-9 \\-/&%]{2,40}?)${TAIL}`, "i"),
    /(?:^|[.;]\s*|\b(?:our|the)\s+)([a-z][a-z0-9 \-/&%]{2,40}?)\s+(?:has|have|is|are)?\s*(?:dropped|declined|fallen|fell|decreased|dipped|plateaued|stagnated|gone down|is down|are down)/i,
    new RegExp(`(?:improve|increase|grow|boost|lift|raise|recover)\\s+(?:our\\s+|the\\s+)?([a-z][a-z0-9 \\-/&%]{2,40}?)${TAIL}`, "i"),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m?.[1]) continue;
    const words = m[1].trim().split(" ").filter((w) => !STOP.has(w.toLowerCase()));
    if (!words.length || words.length > 5) continue;
    return words.join(" ").toLowerCase();
  }
  return undefined;
}

/** Fill {metric} {customer} {customers} {purchase} {purchaseVerb} placeholders. */
export function fillPlaceholders(text: string, v: Vocabulary, metric: string | undefined): string {
  return text
    .replaceAll("{metric}", metric ?? "the affected metric")
    .replaceAll("{customers}", v.customers)
    .replaceAll("{customer}", v.customer)
    .replaceAll("{purchaseVerb}", v.purchaseVerb)
    .replaceAll("{purchase}", v.purchase);
}
