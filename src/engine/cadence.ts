import type { ProblemType } from "@/domain/types";

/**
 * Communication cadence analysis. The interview stores a contact calendar as
 * rows ("Email | Weekly newsletter | Weekly | Tue/Thu 10:00 | Scheduled");
 * this turns them into weekly load per channel and day, and flags patterns in
 * code (stacking, no triggers, one send time, missing lifecycle moments).
 * Flags describe the client's own calendar; no external benchmark is implied.
 */

export const CADENCE_FREQUENCIES = [
  "Several times a day",
  "Daily",
  "Several times a week",
  "Weekly",
  "Fortnightly",
  "Monthly",
  "Quarterly or less",
  "When triggered by an event",
  "One-off",
] as const;
export type CadenceFrequency = (typeof CADENCE_FREQUENCIES)[number];

/** Approximate sends per week for a customer who qualifies for the row. */
const PER_WEEK: Record<CadenceFrequency, number> = {
  "Several times a day": 14,
  Daily: 7,
  "Several times a week": 3,
  Weekly: 1,
  Fortnightly: 0.5,
  Monthly: 12 / 52,
  "Quarterly or less": 4 / 52,
  "When triggered by an event": 0,
  "One-off": 0,
};

export const CADENCE_MODES = ["Scheduled", "Triggered"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export interface CadenceRow {
  channel: string;
  purpose: string;
  frequency: CadenceFrequency;
  days: Day[];
  /** "HH:MM" or "" when it varies. */
  time: string;
  mode: (typeof CADENCE_MODES)[number];
}

const SEP = " | ";

export function formatCadenceRow(r: CadenceRow): string {
  const timing = [r.days.length === 7 ? "Every day" : r.days.join("/"), r.time].filter(Boolean).join(" ") || "Varies";
  return [r.channel, r.purpose || "-", r.frequency, timing, r.mode].map((x) => x.replace(/\|/g, "/").trim()).join(SEP);
}

/** Lenient parse; returns null for rows that are not cadence rows. */
export function parseCadenceRow(s: string): CadenceRow | null {
  const parts = s.split("|").map((p) => p.trim());
  if (parts.length < 3) return null;
  const [channel = "", purpose = "", frequency = "", timing = "", mode = ""] = parts;
  const freq = CADENCE_FREQUENCIES.find((f) => f.toLowerCase() === frequency.toLowerCase());
  if (!channel || !freq) return null;
  const time = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(timing)?.[0] ?? "";
  const days = /every day|daily/i.test(timing) ? [...DAYS] : DAYS.filter((d) => new RegExp(`\\b${d}`, "i").test(timing));
  return {
    channel,
    purpose: purpose === "-" ? "" : purpose,
    frequency: freq,
    days,
    time: time ? time.padStart(5, "0") : "",
    mode: /trigger/i.test(mode) || freq === "When triggered by an event" ? "Triggered" : "Scheduled",
  };
}

export function validCadenceRow(s: string): boolean {
  return parseCadenceRow(s) !== null;
}

export interface CadenceAnalysis {
  rows: CadenceRow[];
  channels: { channel: string; perWeek: number; scheduled: number; triggered: number }[];
  /** Scheduled sends per week if a customer qualifies for every row. */
  perWeek: number;
  /** Scheduled sends landing on each weekday (rows with named days only). */
  byDay: Record<Day, number>;
  triggered: number;
  findings: string[];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Lifecycle moments a case type depends on, and how to spot them in a row's purpose. */
const MOMENTS: { types: ProblemType[]; match: RegExp; missing: string }[] = [
  { types: ["activation", "app_growth"], match: /welcome|onboard|sign.?up|first|activation|setup|getting started/i, missing: "No triggered welcome or onboarding message is listed, the moment an activation case depends on most." },
  { types: ["winback", "retention"], match: /lapse|inactiv|win.?back|we miss|re.?engag|dormant|churn/i, missing: "Nothing is triggered by inactivity or lapse, so at-risk customers only hear from you through general campaigns." },
  { types: ["conversion", "crm", "personalization"], match: /cart|basket|browse|abandon|checkout|viewed/i, missing: "No cart, browse or checkout abandonment trigger is listed, usually the highest-intent moment to reach someone." },
  { types: ["loyalty", "advocacy"], match: /loyal|point|tier|reward|referr|review|anniversary|birthday/i, missing: "No loyalty, milestone or referral moment is listed in the calendar." },
  { types: ["engagement"], match: /digest|recommend|new|content|update|reminder/i, missing: "No recurring value-led message (digest, recommendations, reminders) is listed to build a habit." },
];

export function analyzeCadence(values: string[], ctx: { problemTypes?: ProblemType[]; channels?: string[] } = {}): CadenceAnalysis {
  const rows = values.map(parseCadenceRow).filter((r): r is CadenceRow => !!r);
  const byChannel = new Map<string, { perWeek: number; scheduled: number; triggered: number }>();
  const byDay = Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<Day, number>;
  for (const r of rows) {
    const ch = byChannel.get(r.channel) ?? { perWeek: 0, scheduled: 0, triggered: 0 };
    if (r.mode === "Triggered") ch.triggered++;
    else {
      ch.scheduled++;
      ch.perWeek += PER_WEEK[r.frequency];
      // Spread the weekly volume over the named days.
      if (r.days.length) for (const d of r.days) byDay[d] += PER_WEEK[r.frequency] / r.days.length;
    }
    byChannel.set(r.channel, ch);
  }
  const channels = [...byChannel.entries()].map(([channel, v]) => ({ channel, ...v, perWeek: round(v.perWeek) })).sort((a, b) => b.perWeek - a.perWeek);
  const perWeek = round(channels.reduce((s, c) => s + c.perWeek, 0));
  const triggered = rows.filter((r) => r.mode === "Triggered").length;
  for (const d of DAYS) byDay[d] = round(byDay[d]);

  const findings: string[] = [];
  if (!rows.length) return { rows, channels, perWeek, byDay, triggered, findings };

  const top = channels[0];
  findings.push(
    `Scheduled sends add up to about ${perWeek} a week for a customer on every list${perWeek >= 1 ? ` (${round(perWeek / 7)} a day on average)` : ""}${top && top.perWeek > 0 && channels.length > 1 ? `, most of it on ${top.channel} (${top.perWeek}/week)` : ""}.`,
  );
  if (perWeek > 7) findings.push("That is more than one message a day for anyone who qualifies for every row. Check frequency caps across channels and watch opt-outs and complaint rates by send.");
  if (!triggered) findings.push("Every message is scheduled; none is triggered by what the customer does, so timing depends on the calendar rather than on intent.");
  else if (triggered && rows.length > 1 && triggered === rows.length) findings.push("Every message is event-triggered; there is no scheduled programme, so customers who trigger nothing hear nothing.");

  const stacked = DAYS.map((d) => ({ d, n: byDay[d], channels: new Set(rows.filter((r) => r.mode === "Scheduled" && r.days.includes(d)).map((r) => r.channel)) }))
    .filter((x) => x.n >= 2 && x.channels.size >= 2)
    .sort((a, b) => b.n - a.n)[0];
  if (stacked) findings.push(`${stacked.d} carries about ${stacked.n} sends across ${[...stacked.channels].join(", ")}; stacking channels on one day risks the messages competing with each other.`);

  const times = rows.filter((r) => r.time && r.mode === "Scheduled").map((r) => r.time);
  if (times.length >= 2 && new Set(times).size === 1) findings.push(`All timed sends go out at ${times[0]}. A send-time test (or per-customer send-time optimisation) is a cheap experiment.`);
  const weekend = byDay.Sat + byDay.Sun;
  const weekday = DAYS.slice(0, 5).reduce((s, d) => s + byDay[d], 0);
  if (weekday > 0 && weekend === 0) findings.push("Nothing goes out at the weekend. Fine for B2B; for consumers, check whether weekend behaviour is being missed.");

  const missingChannels = (ctx.channels ?? []).filter((c) => /email|sms|whatsapp|push|in-app|rcs|web push/i.test(c) && !byChannel.has(c));
  if (missingChannels.length) findings.push(`${missingChannels.join(", ")} ${missingChannels.length === 1 ? "is" : "are"} listed as active but ${missingChannels.length === 1 ? "has" : "have"} no cadence here: either unused or not planned.`);

  const types = ctx.problemTypes ?? [];
  for (const m of MOMENTS) {
    if (!m.types.some((t) => types.includes(t))) continue;
    if (!rows.some((r) => m.match.test(r.purpose))) findings.push(m.missing);
  }
  return { rows, channels, perWeek, byDay, triggered, findings: findings.slice(0, 8) };
}
