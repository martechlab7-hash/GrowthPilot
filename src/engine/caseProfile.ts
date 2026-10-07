import type { CaseContext } from "@/domain/types";

/**
 * Two facts shape the whole consulting flow:
 *  - the goal: recover a decline ("revenue fell from X to Y") or grow from
 *    the current baseline ("grow revenue by 5%"), or both;
 *  - where the business sells: offline (stores, dealers, field sales),
 *    online, or both.
 * They are inferred from the problem statement, confirmed in the interview
 * and used to choose questions, wording and the agents' approach.
 */

export type CaseGoal = "decline" | "growth" | "both";
export type SalesChannel = "offline" | "online" | "omni";

export const GOAL_KEY = "business.case_goal";
export const CHANNEL_KEY = "business.sales_channel";

export const GOAL_OPTIONS: Record<CaseGoal, string> = {
  decline: "Recover a decline (a number fell from X to Y)",
  growth: "Grow from where we are (hit a growth target)",
  both: "Both: recover the drop, then grow",
};

export const CHANNEL_OPTIONS: Record<SalesChannel, string> = {
  offline: "Mostly offline (stores, dealers, field sales)",
  online: "Mostly online (website, app, marketplaces)",
  omni: "Both online and offline",
};

const DECLINE = /\b(drop(ped|ping|s)?|declin(e|ed|es|ing)|fell|fall(en|ing|s)?|decreas(e|ed|es|ing)|down (by|from)|dip(ped|s)?|slump(ed)?|plummet(ed)?|shr(ank|unk|inking)|lost|losing|loss of|lower than (last|before)|eroded|erosion|stagnat\w*|not coming back|no longer|worse)\b/i;
const GROWTH = /\b(grow(th)?|increase|boost|scale|expand|double|accelerate|uplift|raise|lift)\b|\b(reach|hit|achieve)\b.{0,40}\b(target|goal|revenue|sales|\d)|\bby\s+\d+(\.\d+)?\s?%|\btarget\b|\bgrowth strategy\b/i;

/** Read the direction from "from X to Y" when both are numbers. */
function fromTo(text: string): CaseGoal | undefined {
  const m = /from\s+[^\d-]{0,4}(-?\d[\d,.]*)\s*(k|m|cr|crore|lakh|l|bn|b|%)?\s+to\s+[^\d-]{0,4}(-?\d[\d,.]*)\s*(k|m|cr|crore|lakh|l|bn|b|%)?/i.exec(text);
  if (!m) return undefined;
  const scale = (u?: string) => ({ k: 1e3, m: 1e6, l: 1e5, lakh: 1e5, cr: 1e7, crore: 1e7, b: 1e9, bn: 1e9 } as Record<string, number>)[(u ?? "").toLowerCase()] ?? 1;
  const a = Number(m[1]!.replace(/,/g, "")) * scale(m[2]);
  const b = Number(m[3]!.replace(/,/g, "")) * scale(m[4]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return undefined;
  return b < a ? "decline" : "growth";
}

export function detectGoal(text: string): CaseGoal | undefined {
  const direction = fromTo(text);
  const decline = direction === "decline" || DECLINE.test(text);
  const growth = direction === "growth" || GROWTH.test(text);
  if (decline && growth) {
    // "Revenue fell 10% and we want to grow it back" is still a recovery case;
    // an explicit growth target on top makes it both.
    return /\b(target|by\s+\d+(\.\d+)?\s?%|growth strategy|beyond|and then grow|further)\b/i.test(text) ? "both" : "decline";
  }
  if (decline) return "decline";
  if (growth) return "growth";
  return undefined;
}

const OFFLINE = /\b(offline|stores?|showrooms?|outlets?|branch(es)?|dealers?|dealerships?|distributors?|retailers?|kirana|general trade|modern trade|walk-?ins?|footfall|foot traffic|in-?store|brick[- ]and[- ]mortar|point of sale|pos|counter sales?|field sales|sales reps?|franchise(es)?|mall|restaurants?|outlet sales|physical)\b/i;
const ONLINE = /\b(online|website|web ?site|e-?commerce|app|apps|checkout|cart|d2c|dtc|digital|marketplaces?|amazon|flipkart|shopify|saas|sign-?ups?|traffic|seo|landing page|funnel|installs?|subscribers?)\b/i;

export function detectChannel(text: string): SalesChannel | undefined {
  const off = OFFLINE.test(text);
  const on = ONLINE.test(text);
  if (off && on) return /\b(omni|both online and offline|online and offline|offline and online)\b/i.test(text) || countHits(text, OFFLINE) <= countHits(text, ONLINE) ? "omni" : "offline";
  if (off) return "offline";
  if (on) return "online";
  return undefined;
}

function countHits(text: string, re: RegExp): number {
  return (text.match(new RegExp(re.source, "gi")) ?? []).length;
}

function pick<T extends string>(options: Record<T, string>, value: unknown): T | undefined {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  if (!v) return undefined;
  return (Object.keys(options) as T[]).find((k) => options[k] === v || k === v);
}

/** The confirmed or inferred goal; undefined when unknown. */
export function goalOf(ctx: CaseContext): CaseGoal | undefined {
  return pick(GOAL_OPTIONS, ctx.fields[GOAL_KEY]?.value);
}

export function channelOf(ctx: CaseContext): SalesChannel | undefined {
  return pick(CHANNEL_OPTIONS, ctx.fields[CHANNEL_KEY]?.value);
}

/** Short guidance every agent receives so analysis follows the right flow. */
export function approachFor(goal: CaseGoal | undefined, channel: SalesChannel | undefined): string[] {
  const notes: string[] = [];
  if (goal === "growth") {
    notes.push("GROWTH CASE: the client wants to grow from the current baseline; nothing has necessarily declined. Do not hunt for the cause of a drop. Establish baseline, target and timeframe, decompose the gap (customers × purchase frequency × basket value × price/mix), size each lever against the target, and frame hypotheses as testable growth opportunities ('lever X can deliver Y of the target because …'). Name constraints (capacity, reach, budget) that cap growth.");
  } else if (goal === "both") {
    notes.push("RECOVER-THEN-GROW CASE: first diagnose why the metric fell (onset, where it is concentrated, what changed), then plan growth beyond the old baseline with sized levers.");
  } else {
    notes.push("DECLINE CASE: find what changed and why: when it started, where it is concentrated, and the root causes, before proposing fixes.");
  }
  if (channel === "offline") {
    notes.push("OFFLINE BUSINESS: sales happen in stores, through dealers/distributors or field sales. Think footfall, in-store conversion, bill value, repeat visits, store/region/dealer differences, staff, stock, local marketing, schemes and customer capture at billing. Do not recommend website, app, digital-funnel or martech-stack changes unless the client raised them; digital is only relevant as a way to drive or retain offline sales (e.g. WhatsApp/SMS to captured customers, local search listings).");
  } else if (channel === "omni") {
    notes.push("OMNICHANNEL BUSINESS: sells both online and offline. Treat them as connected (research online, buy in store and vice versa) and be explicit about which channel each finding and recommendation applies to.");
  }
  return notes;
}
