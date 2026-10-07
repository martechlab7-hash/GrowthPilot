"use client";

import { platformFor } from "@/reports/journeyExport";
import { apiDownload } from "@/lib/client/api";
import { ExperimentDesigner } from "./ExperimentDesigner";
import { Flowchart, toFlowSteps } from "@/components/charts/Flowchart";
import { useState } from "react";
import { Download, Route } from "lucide-react";
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

/** Download a build spec for the client's own engagement platform. */
function JourneyExport({ caseId, journeyId, platform }: { caseId: string; journeyId: string; platform: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const get = async (format: string) => {
    setBusy(format);
    setErr(null);
    try { await apiDownload(`/api/cases/${caseId}/journeys/${journeyId}/export?format=${format}`); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        {(["md", "json", "csv"] as const).map((f) => (
          <Button key={f} size="sm" variant="outline" loading={busy === f} onClick={() => void get(f)}>
            <Download className="h-3.5 w-3.5" /> {{ md: "Build brief", json: "JSON spec", csv: "Steps CSV" }[f]}
          </Button>
        ))}
      </div>
      <span className="text-[11px] text-subtle">Mapped to {platform}</span>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

function JourneyFlow({ j }: { j: ActivationJourney }) {
  return <Flowchart steps={toFlowSteps(j.steps)} />;
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
          <CardHeader title={j.name} description={j.objective} action={<JourneyExport caseId={c.id} journeyId={j.id} platform={platformFor(c).name} />} />
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
      <ExperimentDesigner />
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
