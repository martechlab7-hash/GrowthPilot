"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { MaturityDimension, Recommendation, ScenarioResult } from "@/domain/types";

/** Chart tokens: validated reference categorical slots 1–2, recessive axes. */
const SERIES_1 = "#2a78d6";
const SERIES_2 = "#eb6834";
const AXIS = "#94a3b8";
const GRID = "#eef2f7";
const tick = { fill: "#64748b", fontSize: 12 };

export function MaturityBars({ dimensions }: { dimensions: MaturityDimension[] }) {
  const data = dimensions.map((d) => ({ name: d.dimension, score: d.score, rationale: d.rationale }));
  return (
    <figure>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 32 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={tick} stroke={AXIS} />
          <YAxis type="category" dataKey="name" width={110} tick={tick} stroke={AXIS} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [`${v} / 5`, "Score"]} labelFormatter={(l, p) => `${l} — ${p?.[0]?.payload?.rationale ?? ""}`} />
          <Bar isAnimationActive={false} dataKey="score" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={14}>
            <LabelList dataKey="score" position="right" style={{ fill: "#334155", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">MarTech maturity score by dimension, 0 to 5</figcaption>
    </figure>
  );
}

/** 2×2 prioritisation matrix: effort (x) vs impact (y). */
export function PriorityMatrix({ recommendations }: { recommendations: Recommendation[] }) {
  const data = recommendations.map((r, i) => ({ x: r.effortScore, y: r.impactScore, label: `${i + 1}`, title: r.title, priority: r.priority, confidence: r.confidence }));
  return (
    <figure>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" name="Effort" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={tick} stroke={AXIS} label={{ value: "Effort →", position: "insideBottom", offset: -12, fill: "#64748b", fontSize: 12 }} />
          <YAxis type="number" dataKey="y" name="Impact" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={tick} stroke={AXIS} label={{ value: "Impact →", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }} />
          <ReferenceLine x={3} stroke={AXIS} strokeDasharray="4 4" />
          <ReferenceLine y={3} stroke={AXIS} strokeDasharray="4 4" />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              return (
                <div className="max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-xs shadow">
                  <div className="font-semibold">{p.label}. {p.title}</div>
                  <div className="mt-1 text-muted">{p.priority} · Impact {p.y} · Effort {p.x} · Confidence {Math.round(p.confidence * 100)}%</div>
                </div>
              );
            }}
          />
          <Scatter
            isAnimationActive={false}
            data={data}
            fill={SERIES_1}
            shape={(props: { cx?: number; cy?: number }) => <circle cx={props.cx} cy={props.cy} r={8} fill={SERIES_1} stroke="#fff" strokeWidth={2} />}
          >
            <LabelList dataKey="label" position="top" offset={12} style={{ fill: "#334155", fontSize: 12, fontWeight: 600 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <figcaption className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-muted">
        <span>Top-left: quick wins (high impact, low effort)</span>
        <span className="text-right">Top-right: strategic bets</span>
      </figcaption>
    </figure>
  );
}

export function ScenarioChart({ scenarios, currency }: { scenarios: ScenarioResult[]; currency: string }) {
  const fmt = (n: number) => new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
  const data = scenarios.map((s) => ({ name: s.name.charAt(0).toUpperCase() + s.name.slice(1), revenue: s.incrementalRevenue, profit: s.netProfit }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 16 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={tick} stroke={AXIS} />
        <YAxis tickFormatter={fmt} tick={tick} stroke={AXIS} width={70} />
        <ReferenceLine y={0} stroke={AXIS} />
        <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v, n) => [fmt(Number(v)), n === "revenue" ? "Incremental revenue" : "Net profit (after programme cost)"]} />
        <Legend formatter={(v) => <span style={{ color: "#334155" }}>{v === "revenue" ? "Incremental revenue" : "Net profit"}</span>} wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="revenue" fill={SERIES_1} radius={[4, 4, 0, 0]} barSize={28} />
        <Bar isAnimationActive={false} dataKey="profit" fill={SERIES_2} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
