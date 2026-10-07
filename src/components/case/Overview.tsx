"use client";

import { SimilarCases } from "./SimilarCases";
import { FrameworkInfoButton } from "@/components/frameworks/FrameworkGuide";
import { Badge, Button, Card, CardBody, CardHeader, KindBadge } from "@/components/ui";
import { formatValue, humanizeKey } from "@/engine/context";
import { problemLabel } from "@/lib/labels";
import { nextAction, type CaseTabProps } from "./Workspace";

/** "Where am I, what have we learned, what is missing, what's next" (spec §66). */
export function Overview({ view, go }: CaseTabProps) {
  const { case: c, derived } = view;
  const next = nextAction(c, derived.readiness.ready);
  const facts = Object.values(c.context.fields).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const lastConsultant = [...c.transcript].reverse().find((t) => t.role === "consultant");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Problem" action={<div className="flex flex-wrap gap-1">{c.problemTypes.map((p) => <Badge key={p} tone="blue">{problemLabel(p)}</Badge>)}</div>} />
        <CardBody><p className="whitespace-pre-wrap text-sm leading-relaxed">{c.problemStatement}</p></CardBody>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="What the AI is thinking" />
          <CardBody className="space-y-3 text-sm">
            <p className="leading-relaxed">{lastConsultant?.text ?? "—"}</p>
            <div className="rounded-lg bg-canvas p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Decision / action required</div>
              <div className="mt-1 font-medium">{next.label}</div>
              <div className="text-muted">{next.detail}</div>
              <Button size="sm" className="mt-3" onClick={() => go(next.tab)}>Go</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What is missing" description={`${derived.readiness.criticalAnswered}/${derived.readiness.criticalTotal} critical questions · ${Math.round(derived.readiness.coverage * 100)}% information coverage`} />
          <CardBody className="text-sm">
            {derived.readiness.missingCritical.length ? (
              <ul className="list-disc space-y-1 pl-5">{derived.readiness.missingCritical.map((m) => <li key={m.id}>{m.prompt}</li>)}</ul>
            ) : (
              <p className="text-muted">All critical questions are answered.</p>
            )}
            {c.dataGaps.length > 0 && (
              <>
                <div className="mt-4 font-medium">Critical missing data</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">{c.dataGaps.slice(0, 5).map((g) => <li key={g.dataset}>{g.dataset} <span className="text-muted">— {g.whyNeeded}</span></li>)}</ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="What we have learned" description={`${facts.length} data points captured`} action={<Button size="sm" variant="outline" onClick={() => go("interview")}>Continue interview</Button>} />
        <CardBody>
          {facts.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet. Start the interview.</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {facts.slice(0, 12).map((f) => (
                <div key={f.key}>
                  <dt className="flex items-center gap-2 text-xs text-muted">{humanizeKey(f.key)} <KindBadge kind={f.kind} /></dt>
                  <dd className="mt-0.5">{formatValue(f.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Diagnostic frameworks selected" description="Only frameworks relevant to this problem are applied." />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {derived.frameworks.map((f) => (
            <div key={f.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex items-start justify-between gap-2"><div className="font-medium">{f.name} <span className="text-xs font-normal text-muted">· {f.category}</span></div><FrameworkInfoButton id={f.id} /></div>
              <div className="mt-0.5 text-muted">{f.answers}</div>
              <div className="mt-1 text-xs text-muted">{f.reasons.join(" · ")}</div>
            </div>
          ))}
          {!derived.frameworks.length && <p className="text-sm text-muted">Frameworks will be selected once the problem type is clearer.</p>}
        </CardBody>
      </Card>
      <SimilarCases caseId={c.id} />
    </div>
  );
}
