import type { GuideVisual } from "@/knowledge/guides/types";

/** Illustrative SVG charts for framework guides. Dependency-free and responsive. */
const PALETTE = ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6"];
/** Formats a value with a free-form unit: "%", "£", "£m", "days", "% of revenue"… */
export const fmt = (n: number, unit?: string): string => {
  if (n < 0) return `−${fmt(-n, unit)}`;
  const s = n >= 1000 ? Math.round(n).toLocaleString("en") : String(Math.round(n * 10) / 10);
  if (!unit) return s;
  const u = unit.trim();
  if (u.startsWith("%")) return `${s}${u}`;
  const cur = u.match(/^([£$€₹¥])\s*([a-zA-Z]{0,3})$/);
  if (cur) return `${cur[1]}${s}${cur[2]}`;
  return `${s} ${u}`;
};

/** A "nice" axis step (1, 2, 2.5, 5 × 10^n). */
function niceStep(range: number, ticks = 4) {
  const raw = range / ticks || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

export function GuideChart({ visual }: { visual: GuideVisual }) {
  return (
    <figure className="rounded-2xl border border-line bg-white p-4">
      <figcaption className="mb-3">
        <div className="text-sm font-semibold">{visual.title}</div>
        <div className="text-xs text-muted">{visual.caption}</div>
      </figcaption>
      <Chart v={visual} />
      {hasNumbers(visual) && <div className="mt-2 text-[11px] text-subtle">Illustrative numbers, not benchmarks.</div>}
    </figure>
  );
}

function hasNumbers(v: GuideVisual) {
  return v.type !== "cycle" && !(v.type === "matrix" && !v.points?.length);
}

function Chart({ v }: { v: GuideVisual }) {
  switch (v.type) {
    case "funnel": return <Funnel stages={v.stages} />;
    case "line": return <Line xLabels={v.xLabels} yLabel={v.yLabel} series={v.series} />;
    case "bars": return <Bars items={v.items} unit={v.unit} />;
    case "matrix": return <Matrix {...v} />;
    case "cycle": return <Cycle steps={v.steps} />;
    case "waterfall": return <Waterfall items={v.items} unit={v.unit} />;
  }
}

function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5" role="img" aria-label="Funnel chart">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : undefined;
        const conv = prev ? Math.round((s.value / prev) * 100) : undefined;
        return (
          <div key={s.label} className="grid grid-cols-[minmax(90px,1fr)_3fr_56px] items-center gap-3 text-xs">
            <span className="truncate text-right text-muted" title={s.label}>{s.label}</span>
            <div className="flex justify-center">
              <div
                className="flex h-7 items-center justify-center rounded-md text-[11px] font-semibold text-white"
                style={{ width: `${Math.max(8, (s.value / max) * 100)}%`, background: PALETTE[0], opacity: 1 - i * (0.5 / stages.length) }}
              >
                {fmt(s.value)}
              </div>
            </div>
            <span className="tabular-nums text-subtle">{conv !== undefined ? `${conv}% →` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function Line({ xLabels, yLabel, series }: { xLabels: string[]; yLabel: string; series: { name: string; points: number[] }[] }) {
  const W = 560, H = 230, L = 44, R = 12, T = 12, B = 34;
  const all = series.flatMap((s) => s.points);
  const rawMin = Math.min(0, ...all);
  const step = niceStep(Math.max(...all, 1) - rawMin);
  const minV = Math.floor(rawMin / step) * step;
  const maxV = Math.ceil(Math.max(...all, 1) / step) * step;
  const x = (i: number) => L + (xLabels.length <= 1 ? 0 : (i / (xLabels.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - minV) / (maxV - minV || 1)) * (H - T - B);
  const ticks = Array.from({ length: Math.round((maxV - minV) / step) + 1 }, (_, i) => minV + i * step);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Line chart of ${yLabel}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
            <text x={L - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="#94a3b8">{fmt(t)}</text>
          </g>
        ))}
        {xLabels.map((l, i) => <text key={l + i} x={x(i)} y={H - 14} fontSize="10" textAnchor="middle" fill="#64748b">{l}</text>)}
        <text x={L} y={H - 1} fontSize="10" fill="#94a3b8">{yLabel}</text>
        {series.map((s, si) => (
          <g key={s.name}>
            <polyline fill="none" stroke={PALETTE[si % PALETTE.length]} strokeWidth="2.5" strokeLinejoin="round" points={s.points.map((p, i) => `${x(i)},${y(p)}`).join(" ")} />
            {s.points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="3" fill="white" stroke={PALETTE[si % PALETTE.length]} strokeWidth="2" />)}
          </g>
        ))}
      </svg>
      <Legend names={series.map((s) => s.name)} />
    </div>
  );
}

function Legend({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
      {names.map((n, i) => <span key={n} className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{n}</span>)}
    </div>
  );
}

function Bars({ items, unit }: { items: { label: string; value: number; highlight?: boolean }[]; unit?: string }) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  const anyHighlight = items.some((i) => i.highlight);
  return (
    <div className="space-y-2" role="img" aria-label="Bar chart">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[minmax(90px,1fr)_3fr] items-center gap-3 text-xs">
          <span className="truncate text-right text-muted" title={it.label}>{it.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-5 shrink-0 rounded" style={{ width: `${Math.max(2, (Math.abs(it.value) / max) * 68)}%`, background: !anyHighlight || it.highlight ? PALETTE[0] : "#c7d2fe" }} />
            <span className="whitespace-nowrap tabular-nums font-medium">{fmt(it.value, unit)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Matrix({ xLabel, yLabel, quadrants, points }: { xLabel: string; yLabel: string; quadrants: [string, string, string, string]; points?: { label: string; x: number; y: number }[] }) {
  const W = 420, H = 300, L = 28, B = 26, P = 6;
  const gw = W - L - P, gh = H - B - P;
  const px = (v: number) => L + (Math.min(100, Math.max(0, v)) / 100) * gw;
  const py = (v: number) => P + (1 - Math.min(100, Math.max(0, v)) / 100) * gh;
  const quads: { x: number; y: number; label: string; fill: string }[] = [
    { x: L, y: P, label: quadrants[0], fill: "#f8fafc" },
    { x: L + gw / 2, y: P, label: quadrants[1], fill: "#eef2ff" },
    { x: L, y: P + gh / 2, label: quadrants[2], fill: "#f1f5f9" },
    { x: L + gw / 2, y: P + gh / 2, label: quadrants[3], fill: "#f8fafc" },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-lg" role="img" aria-label={`2 by 2 matrix: ${yLabel} vs ${xLabel}`}>
      {quads.map((q) => (
        <g key={q.label}>
          <rect x={q.x} y={q.y} width={gw / 2} height={gh / 2} fill={q.fill} stroke="#e2e8f0" />
          <foreignObject x={q.x + 6} y={q.y + 6} width={gw / 2 - 12} height={40}>
            <div className="text-[11px] font-semibold leading-tight text-slate-600">{q.label}</div>
          </foreignObject>
        </g>
      ))}
      {(points ?? []).map((p) => (
        <g key={p.label}>
          <circle cx={px(p.x)} cy={py(p.y)} r="6" fill={PALETTE[0]} opacity="0.9" />
          <text x={p.x > 68 ? px(p.x) - 9 : px(p.x) + 9} y={py(p.y) + 4} fontSize="10.5" fill="#0f172a" textAnchor={p.x > 68 ? "end" : "start"}>{p.label}</text>
        </g>
      ))}
      <text x={L + gw / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#64748b">{xLabel} →</text>
      <text x={12} y={P + gh / 2} fontSize="11" textAnchor="middle" fill="#64748b" transform={`rotate(-90 12 ${P + gh / 2})`}>{yLabel} →</text>
    </svg>
  );
}

function Cycle({ steps }: { steps: string[] }) {
  const n = steps.length;
  const S = 340, C = S / 2, R = 118;
  const pos = (i: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-sm" role="img" aria-label={`Cycle: ${steps.join(" then ")}`}>
      <defs>
        <marker id="gc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#a5b4fc" />
        </marker>
      </defs>
      <circle cx={C} cy={C} r={R} fill="none" stroke="#e0e7ff" strokeWidth="2" strokeDasharray="4 6" />
      {steps.map((_, i) => {
        const a = pos(i), b = pos((i + 1) % n);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const ox = (mx - C) * 0.18, oy = (my - C) * 0.18;
        return <path key={i} d={`M${a.x + (b.x - a.x) * 0.28},${a.y + (b.y - a.y) * 0.28} Q${mx + ox},${my + oy} ${a.x + (b.x - a.x) * 0.72},${a.y + (b.y - a.y) * 0.72}`} fill="none" stroke="#a5b4fc" strokeWidth="2" markerEnd="url(#gc-arrow)" />;
      })}
      {steps.map((s, i) => {
        const p = pos(i);
        return (
          <g key={s}>
            <circle cx={p.x} cy={p.y} r="13" fill={PALETTE[0]} />
            <text x={p.x} y={p.y + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill="white">{i + 1}</text>
            <foreignObject x={p.x - 52} y={p.y + 14} width={104} height={34}>
              <div className="text-center text-[10.5px] font-medium leading-tight text-slate-700">{s}</div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

function Waterfall({ items, unit }: { items: { label: string; value: number; total?: boolean }[]; unit?: string }) {
  const W = 560, H = 250, L = 10, T = 26, B = 40;
  const bars = waterfallBars(items);
  const vals = bars.flatMap((b) => (b.total ? [b.end] : [b.start, b.end]));
  const hi = Math.max(...vals, 1), lo = Math.min(...vals);
  // Zoom the axis when the changes are small next to the totals, so deltas stay visible.
  const zoom = lo > 0 && (hi - lo) / hi < 0.5;
  const minV = zoom ? Math.max(0, lo - (hi - lo) * 0.6) : Math.min(0, lo);
  const maxV = hi + (hi - minV) * 0.05;
  const y = (v: number) => T + (1 - (v - minV) / (maxV - minV || 1)) * (H - T - B);
  const bw = (W - L * 2) / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Waterfall chart">
      <line x1={L} x2={W - L} y1={y(minV)} y2={y(minV)} stroke="#cbd5e1" />
      {zoom && <text x={L} y={10} fontSize="9" fill="#94a3b8">Axis starts at {fmt(minV, unit)} to make the changes visible</text>}
      {bars.map((b, i) => {
        const from = b.total ? minV : b.start;
        const top = y(Math.max(from, b.end)), h = Math.max(2, Math.abs(y(from) - y(b.end)));
        const color = b.total ? PALETTE[0] : b.value >= 0 ? "#10b981" : "#ef4444";
        const cx = L + i * bw + bw / 2;
        return (
          <g key={b.label}>
            <rect x={L + i * bw + bw * 0.18} y={top} width={bw * 0.64} height={h} rx="3" fill={color} />
            <text x={cx} y={top - 4} fontSize="10" textAnchor="middle" fill="#334155">{b.total ? fmt(b.value, unit) : `${b.value >= 0 ? "+" : ""}${fmt(b.value, unit)}`}</text>
            <foreignObject x={L + i * bw + 2} y={H - B + 4} width={bw - 4} height={B - 4}>
              <div className="text-center text-[10px] leading-tight text-slate-500">{b.label}</div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

/** Running start/end for each waterfall bar; totals reset the running value. */
function waterfallBars(items: { label: string; value: number; total?: boolean }[]) {
  const out: { label: string; value: number; total?: boolean; start: number; end: number }[] = [];
  let run = 0;
  for (const it of items) {
    const start = it.total ? 0 : run;
    const end = it.total ? it.value : run + it.value;
    run = end;
    out.push({ ...it, start, end });
  }
  return out;
}
