/**
 * Pilot's interview coaching lines: short, warm, personalised and varied, so
 * the interview feels like a conversation rather than a form. Deterministic
 * (seeded by progress) so the same state always renders the same line and no
 * AI call or latency is needed between questions.
 */
export interface CoachInput {
  name: string;
  answered: number;
  remaining: number;
  ready: boolean;
  critical: boolean;
  category?: string;
  /** What just happened: an answer, a skip, or nothing yet in this visit. */
  last?: "answered" | "skipped" | null;
}

export type CoachMood = "delighted" | "sparkle" | "heart" | "wink" | "blink" | null;

export interface CoachLine {
  headline: string;
  detail: string;
  mood: CoachMood;
}

const pick = <T,>(list: T[], seed: number): T => list[Math.abs(seed) % list.length]!;

const AFTER_ANSWER = [
  "Nice one, {name}!",
  "Got it, {name}, thank you.",
  "That really helps, {name}.",
  "Perfect, noted.",
  "Great detail, {name}.",
  "Love it. That narrows things down.",
  "Brilliant, {name}.",
];

const AFTER_SKIP = [
  "No problem, {name}. I'll work around it.",
  "That's fine. Knowing what's unknown is useful too.",
  "Totally okay. I'll note it as a data gap.",
];

const CATEGORY_HINT: Record<string, string> = {
  BUSINESS: "Let's anchor on the business first.",
  CUSTOMER: "Customers are usually where the story hides.",
  PERFORMANCE: "Numbers help me separate signal from noise.",
  DATA: "Quick one about your data. It decides what we can measure.",
  TECHNOLOGY: "Now your tools, so I recommend what you can actually run.",
  MARKETING: "A bit about how you market today.",
  COMPETITION: "Let's look outside for a second.",
  ECONOMICS: "A money question, so the plan pays for itself.",
  EXPERIENCE: "Now the customer experience side.",
  OPERATIONS: "A quick operational one.",
};

const fill = (s: string, name: string) => s.replaceAll("{name}", name);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function coachLine(i: CoachInput): CoachLine {
  const name = i.name || "there";
  const total = i.answered + i.remaining;
  const pct = total ? i.answered / total : 0;
  const togo = `${i.remaining} more ${plural(i.remaining, "question", "questions")} to go`;
  const hint = (i.category && CATEGORY_HINT[i.category.toUpperCase()]) || "";

  if (i.remaining === 0) {
    return { headline: `That's everything, ${name}!`, detail: "I have what I need. Let's run the diagnosis.", mood: "delighted" };
  }
  if (i.answered === 0) {
    return {
      headline: `Hi ${name}! Let's crack this together.`,
      detail: `About ${total} quick ${plural(total, "question", "questions")}, most just a tap. Pick "Other" whenever the options don't fit.`,
      mood: "wink",
    };
  }

  const opener = fill(i.last === "skipped" ? pick(AFTER_SKIP, i.answered) : pick(AFTER_ANSWER, i.answered), name);

  if (i.ready) {
    return { headline: `${opener} I can already diagnose.`, detail: `${togo}. Each one sharpens the picture, or you can jump to diagnosis anytime.`, mood: "sparkle" };
  }
  if (i.remaining <= 2) {
    return { headline: `${opener} Almost there!`, detail: `Just ${i.remaining} more and I can start diagnosing.`, mood: "delighted" };
  }
  if (pct >= 0.5 && pct < 0.6) {
    return { headline: `Halfway there, ${name}!`, detail: `${togo}. The picture is getting clearer with every answer.`, mood: "heart" };
  }
  if (i.critical) {
    return { headline: opener, detail: `This next one matters a lot for the diagnosis. ${togo}.`, mood: "blink" };
  }
  return { headline: opener, detail: `${hint ? `${hint} ` : ""}${togo}.`, mood: i.last === "answered" ? "sparkle" : null };
}
