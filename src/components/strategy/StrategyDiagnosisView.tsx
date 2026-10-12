"use client";

import { useMemo } from "react";
import { AlertTriangle, Search, Stethoscope } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { strategyReadiness } from "@/engine/strategy/readiness";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { EvidenceBadge } from "./shared";

export function StrategyDiagnosisView({ view, ctl, canManage, go }: CaseTabProps) {
  const c = view.case;
  const d = c.strategy!.diagnosis;
  const ready = view.derived.readiness.ready;
  const readiness = useMemo(() => strategyReadiness(c.context), [c.context]);
  const run = () => ctl.run("Diagnosing", "/strategy/diagnose");

  return (
    <div className="space-y-5">
      {!d ? (
        <EmptyState
          icon={<Stethoscope className="h-8 w-8" />}
          title="Diagnose before recommending"
          description={ready ? "The interview covers the essentials. I'll analyse objectives, audience, funnel, channels, data, technology, budget and gaps, and separate what is observed from what is assumed." : `${view.derived.readiness.missingCritical.length} essential question(s) are still open. You can diagnose now; the gaps will be listed as assumptions.`}
          action={canManage && (
            <div className="flex flex-wrap justify-center gap-2">
              {!ready && <Button variant="outline" onClick={() => go("interview")}>Continue the interview</Button>}
              <Button loading={ctl.busy === "Diagnosing"} onClick={run}>{ready ? "Run the diagnosis" : "Diagnose with gaps"}</Button>
            </div>
          )}
        />
      ) : (
        <>
          <Card>
            <CardHeader title="Current-state diagnosis" description={`Updated ${new Date(d.at).toLocaleString()}`} action={canManage && <Button size="sm" variant="outline" loading={ctl.busy === "Diagnosing"} onClick={run}>Re-run</Button>} />
            <CardBody className="space-y-5">
              <p className="text-[15px] leading-relaxed">{d.summary}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <List title="Strengths" items={d.strengths} tone="emerald" />
                <List title="Weaknesses" items={d.weaknesses} tone="red" />
                <List title="Funnel gaps" items={d.funnelGaps} tone="amber" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Root-cause hypotheses" description="Each one says what it rests on and how to confirm it before money is spent." />
            <CardBody className="space-y-2">
              {d.rootCauses.map((r, i) => (
                <div key={i} className="rounded-xl border border-line px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.statement}</span>
                    <EvidenceBadge kind={r.evidenceKind} />
                    <Badge tone={r.confidence >= 0.65 ? "green" : r.confidence >= 0.4 ? "amber" : "red"}>Confidence {Math.round(r.confidence * 100)}%</Badge>
                  </div>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted"><Search className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Validate with: {r.validateWith}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {(d.contradictions.length > 0 || d.assumptions.length > 0) && (
            <Card>
              <CardBody className="grid gap-4 md:grid-cols-2">
                {d.contradictions.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Answers that conflict</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{d.contradictions.map((x) => <li key={x}>{x}</li>)}</ul>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => go("interview")}>Clarify in the interview</Button>
                  </div>
                )}
                {d.assumptions.length > 0 && <List title="Assumptions I had to make" items={d.assumptions} tone="slate" />}
              </CardBody>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader title="Readiness & missing data" description="Computed from your answers; missing items are what the plan has to close." />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {readiness.map((r) => (
              <div key={r.area} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-center justify-between text-sm font-medium"><span>{r.area}</span><span className="tabular-nums">{r.score}/100</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas"><div className={cn("h-full rounded-full", r.score >= 70 ? "bg-emerald-500" : r.score >= 45 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${Math.max(3, r.score)}%` }} /></div>
                {r.missing.length > 0 && <p className="mt-1.5 text-xs text-muted">Missing: {r.missing.join(", ")}</p>}
              </div>
            ))}
          </div>
          {d && d.dataGaps.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Data gap</th><th className="pb-2 font-medium">Why it matters</th><th className="pb-2 font-medium">How to close it</th></tr></thead>
                <tbody className="divide-y divide-line">{d.dataGaps.map((g) => <tr key={g.item}><td className="py-2 pr-3 font-medium">{g.item}</td><td className="py-2 pr-3 text-muted">{g.why}</td><td className="py-2">{g.proposal}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "red" | "amber" | "slate" }) {
  const dot = { emerald: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-400", slate: "bg-slate-400" }[tone];
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{title}</div>
      <ul className="space-y-1.5 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />{x}</li>)}</ul>
    </div>
  );
}
