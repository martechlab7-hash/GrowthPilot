"use client";

import { Stethoscope } from "lucide-react";
import type { EvidenceItem } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, ConfidenceBadge, EmptyState, KindBadge } from "@/components/ui";
import { STAGE_LABELS } from "@/engine/interview";
import type { CaseTabProps } from "./Workspace";

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (!items.length) return <p className="text-sm text-muted">No evidence cited.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-2"><KindBadge kind={e.kind} /><span>{e.statement}</span></li>
      ))}
    </ul>
  );
}

export function DiagnosisView({ view, ctl, canManage, go }: CaseTabProps) {
  const { case: c, derived } = view;
  const d = c.diagnosis;
  const r = derived.readiness;

  const runDiagnosis = async (override: boolean) => {
    if (await ctl.run("Diagnosing", "/diagnose", { body: { override } })) {
      if (!c.hypotheses.some((h) => h.status === "proposed")) {
        if (await ctl.run("Generating hypotheses", "/hypotheses")) go("hypotheses");
      }
    }
  };

  if (!d) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-8 w-8" />}
        title="No diagnosis yet"
        description={
          r.ready
            ? "Discovery has enough information. The Diagnostic Agent will apply the selected frameworks, then the Hypothesis Agent will propose root causes for your review."
            : `Discovery is incomplete: ${r.missingCritical.length} critical question(s) unanswered, ${Math.round(r.coverage * 100)}% coverage. A diagnosis now will carry lower confidence, and this decision will be logged.`
        }
        action={
          canManage && (
            <div className="flex gap-2">
              {!r.ready && <Button variant="outline" onClick={() => go("interview")}>Back to interview</Button>}
              <Button loading={ctl.busy === "Diagnosing" || ctl.busy === "Generating hypotheses"} onClick={() => runDiagnosis(!r.ready)}>
                {r.ready ? "Run diagnosis" : "Diagnose anyway"}
              </Button>
            </div>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Diagnosis"
          description={`Generated ${new Date(d.generatedAt).toLocaleString()}`}
          action={<div className="flex items-center gap-2"><ConfidenceBadge value={d.confidence} />{canManage && <Button size="sm" variant="outline" loading={ctl.busy === "Diagnosing"} onClick={() => runDiagnosis(true)}>Re-run</Button>}</div>}
        />
        <CardBody><p className="text-sm leading-relaxed">{d.summary}</p></CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {([["High confidence", d.highConfidence, "green"], ["Medium confidence", d.mediumConfidence, "amber"], ["Low confidence", d.lowConfidence, "red"]] as const).map(([t, items, tone]) => (
          <Card key={t}>
            <CardBody>
              <Badge tone={tone}>{t}</Badge>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.length ? items.map((x) => <li key={x}>{x}</li>) : <li className="list-none pl-0 text-muted">—</li>}</ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Findings" />
        <CardBody className="divide-y divide-line p-0">
          {d.findings.map((f, i) => (
            <div key={i} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">{f.finding}</p>
                <div className="flex gap-1"><Badge>{STAGE_LABELS[f.stage]}</Badge><Badge tone={f.impact === "high" ? "red" : f.impact === "medium" ? "amber" : "neutral"}>{f.impact} impact</Badge><ConfidenceBadge value={f.confidence} /></div>
              </div>
              <EvidenceList items={f.evidence} />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Critical missing data"
          description="Datasets that could materially change the diagnosis. Share an aggregated export (no personal data) and re-run the diagnosis."
          action={<Button size="sm" variant="outline" onClick={() => go("data")}>Share data</Button>}
        />
        <CardBody className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 pr-3">Dataset</th><th className="pb-2 pr-3">Why needed</th><th className="pb-2 pr-3">Expected insight</th><th className="pb-2 pr-3">Priority</th><th className="pb-2">Alternative proxy</th></tr></thead>
            <tbody className="divide-y divide-line">
              {c.dataGaps.map((g) => <tr key={g.dataset} className="align-top"><td className="py-2 pr-3 font-medium">{g.dataset}</td><td className="py-2 pr-3">{g.whyNeeded}</td><td className="py-2 pr-3">{g.expectedInsight}</td><td className="py-2 pr-3">{g.priority}</td><td className="py-2">{g.alternativeProxy}</td></tr>)}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Assumption register" />
        <CardBody className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 pr-3">Assumption</th><th className="pb-2 pr-3">Impact</th><th className="pb-2 pr-3">Confidence</th><th className="pb-2">Validate?</th></tr></thead>
            <tbody className="divide-y divide-line">
              {c.assumptions.map((a) => <tr key={a.id} className="align-top"><td className="py-2 pr-3"><KindBadge kind="assumption" /> {a.statement}</td><td className="py-2 pr-3">{a.impact}</td><td className="py-2 pr-3">{a.confidence}</td><td className="py-2">{a.validate ? `Yes${a.howToValidate ? ` — ${a.howToValidate}` : ""}` : "No"}</td></tr>)}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {!c.hypotheses.length && canManage && (
        <div className="flex justify-end"><Button loading={ctl.busy === "Generating hypotheses"} onClick={async () => (await ctl.run("Generating hypotheses", "/hypotheses")) && go("hypotheses")}>Generate hypotheses</Button></div>
      )}
    </div>
  );
}
