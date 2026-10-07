/**
 * Deterministic analytics on shared tables (no AI). Detects what the columns
 * are, then runs the analyses that fit: monthly trend + anomalies, which
 * segments drove the change, cohort retention, RFM segmentation and funnel
 * drop-off. Results are small (aggregates only) and become verified evidence
 * the agents can cite as "analysis:<dataset name>".
 */
import type { Table } from "./csv";

export type AnalysisChart =
  | { type: "line"; title: string; caption: string; xLabels: string[]; yLabel: string; series: { name: string; points: number[] }[] }
  | { type: "bars"; title: string; caption: string; unit?: string; items: { label: string; value: number; highlight?: boolean }[] }
  | { type: "funnel"; title: string; caption: string; stages: { label: string; value: number }[] };

export interface Analysis {
  kind: "trend" | "drivers" | "cohort" | "rfm" | "funnel";
  title: string;
  /** Plain-language findings, computed (never generated). */
  findings: string[];
  chart?: AnalysisChart;
  table?: { headers: string[]; rows: string[][] };
}

export interface Roles {
  date?: number;
  id?: number;
  value?: number;
  metrics: number[];
  segments: number[];
  funnel: number[];
}

const VALUE_RE = /revenue|amount|value|sales|spend|price|fare|gmv|turnover|income|aov/i;
const ID_RE = /(^|_|\s)(id|customer|user|member|account|client|pnr|guest|passenger|subscriber)(_|\s|$)|_id$|^id$/i;
const DATE_RE = /date|month|week|day|period|time|year|created|ordered|booked/i;
const STAGE_RE = /visit|session|view|impression|click|open|cart|basket|checkout|order|purchase|booking|signup|sign_up|register|install|lead|mql|sql|opportunit|won|activat|trial|paid|convert/i;

const num = (v: string) => {
  const s = (v ?? "").replace(/[,\s₹$€£%]/g, "");
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

/** Normalise a date-ish cell to a sortable month key "YYYY-MM" (or null). */
export function monthKey(v: string): string | null {
  const s = (v ?? "").trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}`;
  const t = Date.parse(s);
  if (!Number.isNaN(t) && /[a-z]{3}/i.test(s)) {
    const d = new Date(t);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}
const dayOf = (v: string) => {
  const s = (v ?? "").trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return Date.UTC(+iso[1]!, +iso[2]! - 1, +iso[3]!);
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return Date.UTC(+dmy[3]!, +dmy[2]! - 1, +dmy[1]!);
  const ym = s.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) return Date.UTC(+ym[1]!, +ym[2]! - 1, 1);
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
};

export function detectRoles(t: Table): Roles {
  const n = t.rows.length || 1;
  const sample = t.rows.slice(0, 500);
  const share = (i: number, test: (v: string) => boolean) => {
    const vals = sample.map((r) => r[i] ?? "").filter(Boolean);
    return vals.length ? vals.filter(test).length / vals.length : 0;
  };
  const distinct = (i: number) => new Set(t.rows.map((r) => r[i])).size;
  const numeric = t.headers.map((_, i) => share(i, (v) => !Number.isNaN(num(v))) > 0.9);
  const dateLike = t.headers.map((h, i) => !numeric[i] && share(i, (v) => monthKey(v) !== null) > 0.9 && (DATE_RE.test(h) || true));
  const roles: Roles = { metrics: [], segments: [], funnel: [] };
  roles.date = dateLike.findIndex((d, i) => d && DATE_RE.test(t.headers[i]!));
  if (roles.date === -1) roles.date = dateLike.indexOf(true);
  if (roles.date === -1) delete roles.date;
  t.headers.forEach((h, i) => {
    if (i === roles.date) return;
    const d = distinct(i);
    if (!numeric[i] && (ID_RE.test(h) || /^ID-[0-9a-z]{7}$/.test(t.rows[0]?.[i] ?? "")) && d > Math.min(30, n * 0.2)) {
      if (roles.id === undefined) roles.id = i;
      return;
    }
    if (numeric[i]) {
      if (roles.value === undefined && VALUE_RE.test(h)) roles.value = i;
      else roles.metrics.push(i);
      return;
    }
    if (d >= 2 && d <= 40) roles.segments.push(i);
  });
  // Funnel: 3+ numeric stage columns whose totals fall step by step.
  const stageCols = [...roles.metrics, ...(roles.value !== undefined ? [] : [])].filter((i) => STAGE_RE.test(t.headers[i]!));
  if (stageCols.length >= 3) {
    const totals = stageCols.map((i) => t.rows.reduce((s, r) => s + (num(r[i] ?? "") || 0), 0));
    const order = stageCols.map((c, k) => ({ c, v: totals[k]! })).sort((a, b) => b.v - a.v);
    if (order.every((o, k) => k === 0 || o.v <= order[k - 1]!.v) && order[0]!.v > 0) roles.funnel = order.map((o) => o.c);
  }
  return roles;
}

const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100);
const fmt = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en") : String(Math.round(n * 10) / 10));
const sign = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 10) / 10}%`;

export function analyzeTable(t: Table, name = "data"): Analysis[] {
  if (!t.rows.length) return [];
  const roles = detectRoles(t);
  const out: Analysis[] = [];
  const measure = roles.value ?? roles.metrics[0];
  const measureName = measure !== undefined ? t.headers[measure]! : undefined;
  const transactional = roles.id !== undefined && roles.date !== undefined;

  // 1. Trend by month (+ anomalies).
  if (roles.date !== undefined) {
    const byMonth = new Map<string, number>();
    for (const r of t.rows) {
      const m = monthKey(r[roles.date] ?? "");
      if (!m) continue;
      const v = measure !== undefined ? num(r[measure] ?? "") || 0 : 1;
      byMonth.set(m, (byMonth.get(m) ?? 0) + v);
    }
    const months = [...byMonth.keys()].sort();
    if (months.length >= 2) {
      const vals = months.map((m) => byMonth.get(m)!);
      const label = measureName ?? "rows";
      const first = vals[0]!, last = vals.at(-1)!, prev = vals.at(-2)!;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      const peak = months[vals.indexOf(Math.max(...vals))]!;
      const low = months[vals.indexOf(Math.min(...vals))]!;
      const anomalies = sd > 0 ? months.filter((_, i) => Math.abs(vals[i]! - mean) / sd > 2) : [];
      const findings = [
        `${label} went from ${fmt(first)} in ${months[0]} to ${fmt(last)} in ${months.at(-1)} (${sign(pct(last, first))}).`,
        `Latest month vs the one before: ${sign(pct(last, prev))}.`,
        `Peak ${peak} (${fmt(byMonth.get(peak)!)}), low ${low} (${fmt(byMonth.get(low)!)}).`,
        ...(anomalies.length ? [`Unusual months (more than 2 standard deviations from the average): ${anomalies.join(", ")}.`] : []),
      ];
      if (months.length >= 13) {
        const yoy = months.slice(12).map((m, i) => pct(byMonth.get(m)!, byMonth.get(months[i]!)!));
        findings.push(`Year-on-year change for the latest month: ${sign(yoy.at(-1)!)} (checks for seasonality).`);
      }
      out.push({
        kind: "trend",
        title: `${label} by month`,
        findings,
        chart: { type: "line", title: `${label} by month`, caption: `Monthly total of ${label} in ${name}.`, xLabels: months, yLabel: label, series: [{ name: label, points: vals.map((v) => Math.round(v * 100) / 100) }] },
      });

      // 2. Drivers: which segment values explain the change between the first and last half of the period.
      if (roles.segments.length && months.length >= 2) {
        const mid = months[Math.floor(months.length / 2)]!;
        const seg = roles.segments.map((si) => {
          const before = new Map<string, number>();
          const after = new Map<string, number>();
          for (const r of t.rows) {
            const m = monthKey(r[roles.date!] ?? "");
            if (!m) continue;
            const v = measure !== undefined ? num(r[measure] ?? "") || 0 : 1;
            const key = r[si] || "(blank)";
            const map = m < mid ? before : after;
            map.set(key, (map.get(key) ?? 0) + v);
          }
          const keys = [...new Set([...before.keys(), ...after.keys()])];
          const deltas = keys.map((k) => ({ k, d: (after.get(k) ?? 0) - (before.get(k) ?? 0) }));
          const total = deltas.reduce((s, x) => s + x.d, 0);
          return { si, deltas, total, spread: Math.max(...deltas.map((x) => Math.abs(x.d))) };
        }).sort((a, b) => b.spread - a.spread)[0];
        if (seg && seg.total !== 0) {
          const sorted = [...seg.deltas].sort((a, b) => (seg.total < 0 ? a.d - b.d : b.d - a.d));
          const top = sorted[0]!;
          const share = Math.round((top.d / seg.total) * 100);
          const segName = t.headers[seg.si]!;
          out.push({
            kind: "drivers",
            title: `What drove the change, by ${segName}`,
            findings: [
              `Comparing ${months[0]}–${months[Math.floor(months.length / 2) - 1] ?? mid} with ${mid}–${months.at(-1)}, total ${measureName ?? "rows"} changed by ${fmt(seg.total)}.`,
              `${segName} "${top.k}" accounts for ${share}% of that change (${fmt(top.d)}).`,
              ...(sorted[1] ? [`Next: "${sorted[1].k}" (${fmt(sorted[1].d)}).`] : []),
            ],
            chart: {
              type: "bars",
              title: `Change in ${measureName ?? "rows"} by ${segName}`,
              caption: "Second half of the period minus first half; the largest contributor is highlighted.",
              items: sorted.slice(0, 8).map((x, i) => ({ label: x.k.slice(0, 28), value: Math.round(x.d * 100) / 100, highlight: i === 0 })),
            },
          });
        }
      }
    }
  }

  // 3. Cohort retention (transaction-level data).
  if (transactional) {
    const first = new Map<string, string>();
    const active = new Map<string, Set<string>>();
    for (const r of t.rows) {
      const id = r[roles.id!];
      const m = monthKey(r[roles.date!] ?? "");
      if (!id || !m) continue;
      if (!first.has(id) || m < first.get(id)!) first.set(id, m);
      if (!active.has(id)) active.set(id, new Set());
      active.get(id)!.add(m);
    }
    const monthsAll = [...new Set([...first.values()])].sort();
    const idx = (m: string) => { const [y, mo] = m.split("-").map(Number); return y! * 12 + mo!; };
    const cohorts = monthsAll.slice(-8).map((cm) => {
      const members = [...first.entries()].filter(([, f]) => f === cm).map(([id]) => id);
      const ret = [1, 2, 3, 6].map((k) => {
        const target = idx(cm) + k;
        const count = members.filter((id) => [...active.get(id)!].some((m) => idx(m) === target)).length;
        return members.length ? Math.round((count / members.length) * 1000) / 10 : 0;
      });
      return { cm, size: members.length, ret };
    }).filter((c) => c.size > 0);
    if (cohorts.length >= 2 && first.size >= 20) {
      const m1 = cohorts.map((c) => c.ret[0]!);
      const best = cohorts[m1.indexOf(Math.max(...m1))]!;
      const worst = cohorts[m1.indexOf(Math.min(...m1))]!;
      out.push({
        kind: "cohort",
        title: "Cohort retention",
        findings: [
          `${first.size.toLocaleString("en")} customers grouped by first month. Month-1 return rate ranges from ${worst.ret[0]}% (${worst.cm}) to ${best.ret[0]}% (${best.cm}).`,
          `Latest complete cohort ${cohorts.at(-2)?.cm ?? cohorts[0]!.cm}: ${cohorts.at(-2)?.ret[0] ?? cohorts[0]!.ret[0]}% returned in month 1.`,
        ],
        table: { headers: ["Cohort", "Customers", "Month 1", "Month 2", "Month 3", "Month 6"], rows: cohorts.map((c) => [c.cm, c.size.toLocaleString("en"), ...c.ret.map((r) => `${r}%`)]) },
        chart: { type: "line", title: "Month-1 return rate by cohort", caption: "Share of each cohort that bought again in the following month.", xLabels: cohorts.map((c) => c.cm), yLabel: "% returning", series: [{ name: "Month 1", points: m1 }] },
      });
    }
  }

  // 4. RFM segmentation.
  if (transactional) {
    const per = new Map<string, { last: number; f: number; m: number }>();
    let maxDay = 0;
    for (const r of t.rows) {
      const id = r[roles.id!];
      const d = dayOf(r[roles.date!] ?? "");
      if (!id || Number.isNaN(d)) continue;
      maxDay = Math.max(maxDay, d);
      const v = roles.value !== undefined ? num(r[roles.value] ?? "") || 0 : 0;
      const cur = per.get(id) ?? { last: 0, f: 0, m: 0 };
      per.set(id, { last: Math.max(cur.last, d), f: cur.f + 1, m: cur.m + v });
    }
    if (per.size >= 30) {
      const rows = [...per.values()].map((x) => ({ ...x, rec: (maxDay - x.last) / 86_400_000 }));
      const score = (vals: number[], v: number, higherBetter: boolean) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const rank = sorted.filter((x) => x <= v).length / sorted.length;
        const q = Math.min(5, Math.max(1, Math.ceil(rank * 5)));
        return higherBetter ? q : 6 - q;
      };
      const recs = rows.map((r) => r.rec), fs = rows.map((r) => r.f), ms = rows.map((r) => r.m);
      const seg = new Map<string, { n: number; m: number }>();
      for (const r of rows) {
        const R = score(recs, r.rec, false), F = score(fs, r.f, true);
        const name = R >= 4 && F >= 4 ? "Champions" : R >= 3 && F >= 3 ? "Loyal" : R <= 2 && F >= 3 ? "At risk" : R >= 4 && F <= 2 ? "New / promising" : R <= 2 && F <= 2 ? "Hibernating" : "Needs attention";
        const cur = seg.get(name) ?? { n: 0, m: 0 };
        seg.set(name, { n: cur.n + 1, m: cur.m + r.m });
        void ms;
      }
      const totalM = rows.reduce((s, r) => s + r.m, 0);
      const list = [...seg.entries()].sort((a, b) => b[1].n - a[1].n);
      const atRisk = seg.get("At risk");
      out.push({
        kind: "rfm",
        title: "RFM customer segments",
        findings: [
          `${per.size.toLocaleString("en")} customers scored on recency and frequency${roles.value !== undefined ? " (value from " + t.headers[roles.value] + ")" : ""}.`,
          ...(atRisk ? [`"At risk" (bought often, not recently): ${atRisk.n.toLocaleString("en")} customers${totalM ? `, ${Math.round((atRisk.m / totalM) * 100)}% of value` : ""}.`] : []),
          ...(seg.get("Champions") ? [`Champions: ${seg.get("Champions")!.n.toLocaleString("en")} customers${totalM ? `, ${Math.round((seg.get("Champions")!.m / totalM) * 100)}% of value` : ""}.`] : []),
        ],
        table: { headers: ["Segment", "Customers", "Share of customers", ...(totalM ? ["Share of value"] : [])], rows: list.map(([k, v]) => [k, v.n.toLocaleString("en"), `${Math.round((v.n / per.size) * 100)}%`, ...(totalM ? [`${Math.round((v.m / totalM) * 100)}%`] : [])]) },
        chart: { type: "bars", title: "Customers by RFM segment", caption: "Segments from recency and frequency quintiles; at-risk customers are the retention priority.", items: list.map(([k, v]) => ({ label: k, value: v.n, highlight: k === "At risk" })) },
      });
    }
  }

  // 5. Funnel drop-off.
  if (roles.funnel.length >= 3) {
    const stages = roles.funnel.map((i) => ({ label: t.headers[i]!, value: t.rows.reduce((s, r) => s + (num(r[i] ?? "") || 0), 0) }));
    const steps = stages.slice(1).map((s, k) => ({ from: stages[k]!.label, to: s.label, rate: stages[k]!.value ? (s.value / stages[k]!.value) * 100 : 0 }));
    const worst = [...steps].sort((a, b) => a.rate - b.rate)[0]!;
    out.push({
      kind: "funnel",
      title: "Funnel conversion",
      findings: [
        `Overall: ${Math.round((stages.at(-1)!.value / stages[0]!.value) * 1000) / 10}% of ${stages[0]!.label} reach ${stages.at(-1)!.label}.`,
        `Biggest drop: ${worst.from} → ${worst.to} (${Math.round(worst.rate * 10) / 10}% continue).`,
      ],
      chart: { type: "funnel", title: "Funnel totals", caption: "Totals per stage across the file; the step with the lowest pass-through is the first place to look.", stages: stages.map((s) => ({ label: s.label, value: Math.round(s.value) })) },
    });
  }

  return out;
}
