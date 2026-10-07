"use client";

import { ArrowDown, Route } from "lucide-react";
import type { ActivationJourney } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import type { CaseTabProps } from "./Workspace";

function PlanEmpty({ view, ctl, canManage, go, what }: CaseTabProps & { what: string }) {
  const hasRecs = view.case.recommendations.length > 0;
  return (
    <EmptyState
      icon={<Route className="h-8 w-8" />}
      title={`No ${what} yet`}
      description={hasRecs ? "The Activation and Measurement agents turn the recommendations into journeys, KPIs and experiments." : "Build recommendations first."}
      action={hasRecs ? canManage && <Button loading={ctl.busy === "Designing plan"} onClick={() => ctl.run("Designing plan", "/plan")}>Design activation & measurement</Button> : <Button onClick={() => go("recommendations")}>Go to recommendations</Button>}
    />
  );
}

const STEP_TONE: Record<string, "blue" | "neutral" | "amber" | "green" | "violet"> = {
  trigger: "blue", wait: "neutral", condition: "amber", action: "violet", channel: "green", measure: "neutral",
};

function JourneyFlow({ j }: { j: ActivationJourney }) {
  const byId = new Map(j.steps.map((s) => [s.id, s]));
  return (
    <ol className="flex flex-col items-start gap-1">
      {j.steps.map((s, i) => (
        <li key={s.id} className="w-full max-w-xl">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
            <Badge tone={STEP_TONE[s.type]}>{s.type}</Badge>
            <span>{s.label}</span>
          </div>
          {s.branches?.length ? (
            <div className="ml-6 mt-1 flex flex-wrap gap-2 text-xs text-muted">
              {s.branches.map((b) => <span key={b.label} className="rounded-full bg-canvas px-2 py-0.5">{b.label} → {byId.get(b.next)?.label ?? b.next}</span>)}
            </div>
          ) : null}
          {i < j.steps.length - 1 && <ArrowDown className="my-1 ml-6 h-3.5 w-3.5 text-slate-300" />}
        </li>
      ))}
    </ol>
  );
}

export function ActivationView(props: CaseTabProps) {
  const c = props.view.case;
  if (!c.journeys.length && !c.customerJourney.length) return <PlanEmpty {...props} what="activation plan" />;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Customer journey map" description="Need, behaviour, pain point, trigger, activation and KPI at every stage." />
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>{["Stage", "Customer need", "Behaviour", "Pain point", "Objective", "Data", "Trigger", "Activation", "Technology", "KPI"].map((h) => <th key={h} className="pb-2 pr-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {c.customerJourney.map((s) => (
                <tr key={s.stage} className="align-top">
                  <td className="py-2 pr-3 font-medium">{s.stage}</td><td className="py-2 pr-3">{s.customerNeed}</td><td className="py-2 pr-3">{s.customerBehavior}</td><td className="py-2 pr-3">{s.painPoint}</td>
                  <td className="py-2 pr-3">{s.businessObjective}</td><td className="py-2 pr-3">{s.data.join(", ")}</td><td className="py-2 pr-3">{s.trigger}</td><td className="py-2 pr-3">{s.activation}</td>
                  <td className="py-2 pr-3">{s.technology.join(", ")}</td><td className="py-2">{s.kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      {c.journeys.map((j) => (
        <Card key={j.id}>
          <CardHeader title={j.name} description={j.objective} />
          <CardBody className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <JourneyFlow j={j} />
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Audience</dt><dd>{j.audience}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Channels</dt><dd className="mt-1 flex flex-wrap gap-1">{j.channels.map((ch) => <Badge key={ch}>{ch}</Badge>)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Control group</dt><dd>{j.controlGroup}</dd></div>
            </dl>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

const LEVELS = ["business", "customer", "marketing", "channel", "operational"] as const;

export function MeasurementView(props: CaseTabProps) {
  const c = props.view.case;
  const m = c.measurement;
  if (!m) return <PlanEmpty {...props} what="measurement framework" />;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="North Star metric" />
        <CardBody><p className="text-lg font-semibold">{m.northStar}</p></CardBody>
      </Card>
      <Card>
        <CardHeader title="KPI tree" description="Business → Customer → Marketing → Channel → Operational" />
        <CardBody className="space-y-4">
          {LEVELS.map((level) => {
            const kpis = m.kpis.filter((k) => k.level === level);
            if (!kpis.length) return null;
            return (
              <div key={level}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{level} KPIs</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {kpis.map((k) => (
                    <div key={k.name} className="rounded-lg border border-line p-3 text-sm">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{k.name}</span><Badge tone={k.type === "leading" ? "blue" : "neutral"}>{k.type}</Badge></div>
                      <div className="mt-1 text-muted">{k.definition}</div>
                      <div className="mt-1 text-xs text-muted">Baseline: {k.baseline ?? "to be baselined"} · Target: {k.target ?? "to be set"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card><CardHeader title="Attribution" /><CardBody className="text-sm">{m.attribution}</CardBody></Card>
        <Card><CardHeader title="Incrementality" /><CardBody className="text-sm">{m.incrementality}</CardBody></Card>
      </div>
      <Card>
        <CardHeader title="Experimentation plan" />
        <CardBody className="space-y-4">
          {c.experiments.map((e) => (
            <div key={e.id} className="rounded-lg border border-line p-4 text-sm">
              <p className="font-medium">{e.hypothesis}</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {([["Audience", e.audience], ["Control", e.control], ["Treatment", e.treatment], ["Primary KPI", e.primaryKpi], ["Secondary KPIs", e.secondaryKpis.join(", ")], ["Sample size", e.sampleSize], ["Duration", e.duration], ["Expected lift (assumption)", e.expectedLift], ["Success criteria", e.successCriteria]] as const).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted">{k}</dt><dd>{v || "—"}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
