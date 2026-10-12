"use client";

import { useState } from "react";
import { Beaker, Gauge, ShieldAlert, Star } from "lucide-react";
import type { StrategyKpi } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { EvidenceBadge, cap } from "./shared";

const LEVELS: { level: StrategyKpi["level"]; title: string; hint: string }[] = [
  { level: "north_star", title: "North star", hint: "The one number the strategy moves" },
  { level: "primary", title: "Primary", hint: "Drivers of the north star" },
  { level: "secondary", title: "Secondary", hint: "Channel and programme health" },
  { level: "guardrail", title: "Guardrails", hint: "What must not get worse" },
];
const STATUS: Record<NonNullable<StrategyKpi["status"]>, [string, "neutral" | "green" | "amber" | "red"]> = {
  not_started: ["Not started", "neutral"], on_track: ["On track", "green"], at_risk: ["At risk", "amber"], off_track: ["Off track", "red"],
};

export function KpiView({ view, ctl, canContribute, go }: CaseTabProps) {
  const s = view.case.strategy!;
  if (!s.kpis.length) {
    return <EmptyState icon={<Gauge className="h-8 w-8" />} title="No KPIs yet" description="The KPI tree, experiments and risk register are built with the roadmap." action={<button className="text-sm font-medium text-brand-600" onClick={() => go("roadmap")}>Go to roadmap</button>} />;
  }
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="KPI tree" description="Baselines come only from your answers; where there is none, measure it first. Record actuals here to track the plan against reality." />
        <CardBody className="space-y-5">
          {LEVELS.map(({ level, title, hint }) => {
            const list = s.kpis.filter((k) => k.level === level);
            if (!list.length) return null;
            return (
              <div key={level}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">{level === "north_star" ? <Star className="h-4 w-4 text-amber-500" /> : level === "guardrail" ? <ShieldAlert className="h-4 w-4 text-red-500" /> : <Gauge className="h-4 w-4 text-brand-600" />}{title}<span className="font-normal text-muted">· {hint}</span></div>
                <div className={cn("grid gap-3", level === "north_star" ? "" : "md:grid-cols-2")}>
                  {list.map((k) => <KpiCard key={k.id} k={k} ctl={ctl} canEdit={canContribute} />)}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {s.experiments.length > 0 && (
        <Card>
          <CardHeader title="Experiments" description="How each bet will be proven before it is scaled." />
          <CardBody className="grid gap-3 md:grid-cols-2">
            {s.experiments.map((e) => (
              <div key={e.name} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-center gap-1.5 font-semibold"><Beaker className="h-4 w-4 text-violet-600" />{e.name}</div>
                <p className="mt-1">{e.hypothesis}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted">Metric</dt><dd>{e.metric}</dd>
                  <dt className="text-muted">Design</dt><dd>{e.design}</dd>
                  <dt className="text-muted">Success</dt><dd>{e.successThreshold}</dd>
                  <dt className="text-muted">Duration</dt><dd>{e.duration}</dd>
                </dl>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {s.risks.length > 0 && (
        <Card>
          <CardHeader title="Risk register" />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Risk</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Likelihood</th><th className="pb-2 font-medium">Impact</th><th className="pb-2 font-medium">Mitigation</th></tr></thead>
              <tbody className="divide-y divide-line">
                {s.risks.map((r) => {
                  const tone = (x: string) => (x === "high" ? "red" : x === "medium" ? "amber" : "green") as "red" | "amber" | "green";
                  return <tr key={r.risk}><td className="py-2 pr-3 font-medium">{r.risk}</td><td className="py-2 pr-3">{cap(r.category)}</td><td className="py-2 pr-3"><Badge tone={tone(r.likelihood)}>{cap(r.likelihood)}</Badge></td><td className="py-2 pr-3"><Badge tone={tone(r.impact)}>{cap(r.impact)}</Badge></td><td className="py-2">{r.mitigation}</td></tr>;
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ k, ctl, canEdit }: { k: StrategyKpi; ctl: CaseTabProps["ctl"]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [actual, setActual] = useState(k.actual ?? "");
  const [status, setStatus] = useState<NonNullable<StrategyKpi["status"]>>(k.status ?? "not_started");
  const [action, setAction] = useState(k.correctiveAction ?? "");
  const st = STATUS[k.status ?? "not_started"];
  const needsAction = (status === "at_risk" || status === "off_track") && !action.trim();
  return (
    <div className={cn("rounded-xl border p-3 text-sm", k.status === "off_track" ? "border-red-200" : k.status === "at_risk" ? "border-amber-200" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{k.name}</span>
        <span className="flex gap-1"><EvidenceBadge kind={k.evidenceKind} /><Badge tone={st[1]}>{st[0]}</Badge></span>
      </div>
      <p className="mt-1 text-muted">{k.definition}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted">Baseline</div><div className="font-medium">{k.baseline ?? "Measure first"}</div></div>
        <div><div className="text-muted">Target</div><div className="font-medium">{k.target ?? "After baseline"}</div></div>
        <div><div className="text-muted">Actual</div><div className="font-medium">{k.actual ?? "Not recorded"}</div></div>
      </div>
      <p className="mt-1.5 text-xs text-muted">{k.cadence} · {k.source}</p>
      {k.correctiveAction && <p className="mt-1.5 text-xs"><span className="font-medium">Corrective action:</span> {k.correctiveAction}</p>}
      {canEdit && !editing && <button type="button" className="mt-2 text-xs font-medium text-brand-600" onClick={() => setEditing(true)}>Record actual</button>}
      {editing && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Input value={actual} onChange={(e) => setActual(e.target.value)} placeholder="e.g. 19.5%" aria-label={`Actual for ${k.name}`} />
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label={`Status of ${k.name}`}>{(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((x) => <option key={x} value={x}>{STATUS[x][0]}</option>)}</Select>
          </div>
          {(status === "at_risk" || status === "off_track") && <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Corrective action (required)" aria-label={`Corrective action for ${k.name}`} />}
          <div className="flex gap-2">
            <Button size="sm" disabled={needsAction} loading={ctl.busy === `KPI ${k.id}`} onClick={async () => {
              const ok = await ctl.run(`KPI ${k.id}`, `/strategy/kpis/${k.id}`, { method: "PATCH", body: { ...(actual.trim() ? { actual: actual.trim() } : {}), status, ...(action.trim() ? { correctiveAction: action.trim() } : {}) } });
              if (ok) setEditing(false);
            }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
