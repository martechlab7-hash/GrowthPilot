"use client";

import { useState } from "react";
import { Lightbulb, Lock } from "lucide-react";
import type { Hypothesis } from "@/domain/types";
import { Badge, Button, Card, CardBody, ConfidenceBadge, EmptyState, Textarea } from "@/components/ui";
import { EvidenceList } from "./DiagnosisView";
import type { CaseTabProps } from "./Workspace";

const STATUS: Record<Hypothesis["status"], { label: string; tone: "neutral" | "green" | "amber" | "red" }> = {
  proposed: { label: "Awaiting your review", tone: "neutral" },
  agreed: { label: "Agreed", tone: "green" },
  partially_agreed: { label: "Partially agreed", tone: "amber" },
  disagreed: { label: "Rejected", tone: "red" },
};

/** Hypothesis Approval Gate (spec §14–15). The AI stops here until the user decides. */
export function Hypotheses({ view, ctl, canManage, go }: CaseTabProps) {
  const { case: c } = view;
  const active = c.hypotheses.filter((h) => h.status !== "disagreed");
  const rejected = c.hypotheses.filter((h) => h.status === "disagreed");
  const pending = c.hypotheses.filter((h) => h.status === "proposed").length;
  const anyAgreed = c.hypotheses.some((h) => h.status === "agreed" || h.status === "partially_agreed");

  if (!c.diagnosis) {
    return <EmptyState icon={<Lightbulb className="h-8 w-8" />} title="Diagnosis needed first" description="Hypotheses are built from the diagnosis." action={<Button onClick={() => go("diagnosis")}>Go to diagnosis</Button>} />;
  }
  if (!c.hypotheses.length) {
    return (
      <EmptyState icon={<Lightbulb className="h-8 w-8" />} title="No hypotheses yet"
        action={canManage && <Button loading={ctl.busy === "Generating hypotheses"} onClick={() => ctl.run("Generating hypotheses", "/hypotheses")}>Generate hypotheses</Button>} />
    );
  }

  const rebuild = async () => {
    if (await ctl.run("Rebuilding diagnosis", "/diagnose", { body: { override: true } })) await ctl.run("Generating hypotheses", "/hypotheses");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Here is what I believe is happening</h2>
        <p className="mt-1 text-sm text-muted">Review each hypothesis. I will not build the strategy until you have agreed, challenged or edited them.</p>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${pending ? "border-amber-200 bg-amber-50" : anyAgreed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {pending ? `${pending} hypothesis(es) awaiting your review.` : anyAgreed ? "Validation complete — the strategy can now be built." : "All hypotheses were rejected. Rebuild the diagnosis with your feedback."}
        </span>
        <div className="flex gap-2">
          {canManage && (!anyAgreed || c.analysisStale) && !pending && <Button size="sm" variant="outline" loading={ctl.busy === "Rebuilding diagnosis" || ctl.busy === "Generating hypotheses"} onClick={rebuild}>Rebuild diagnosis</Button>}
          {canManage && !pending && anyAgreed && (
            <Button size="sm" loading={ctl.busy === "Building recommendations"} onClick={async () => (await ctl.run("Building recommendations", "/recommendations")) && go("recommendations")}>
              {c.recommendations.length ? "Rebuild recommendations" : "Build recommendations"}
            </Button>
          )}
        </div>
      </div>

      {active.map((h, i) => <HypothesisCard key={h.id} h={h} index={i + 1} ctl={ctl} canManage={canManage} />)}

      {rejected.length > 0 && (
        <details className="rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium">Rejected hypotheses ({rejected.length}) — excluded from the strategy</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {rejected.map((h) => <li key={h.id}><span className="line-through decoration-slate-400">{h.statement}</span>{h.userFeedback && <div className="text-muted">Your reason: {h.userFeedback}</div>}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function HypothesisCard({ h, index, ctl, canManage }: { h: Hypothesis; index: number; ctl: CaseTabProps["ctl"]; canManage: boolean }) {
  const [mode, setMode] = useState<null | "partially_agree" | "disagree" | "edit" | "info">(null);
  const [text, setText] = useState("");
  const [statement, setStatement] = useState(h.statement);
  const busy = ctl.busy === `Reviewing ${h.id}`;
  const review = async (action: string, body: Record<string, unknown> = {}) => {
    if (await ctl.run(`Reviewing ${h.id}`, `/hypotheses/${h.id}/review`, { body: { action, ...body } })) {
      setMode(null);
      setText("");
    }
  };
  const s = STATUS[h.status];

  return (
    <Card className={h.status === "proposed" ? "border-brand-600/30" : ""}>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Hypothesis {index}</div>
            <p className="mt-1 text-base font-semibold leading-snug">{h.statement}</p>
            <p className="mt-1 text-sm text-muted">Driver: {h.driver}</p>
          </div>
          <div className="flex flex-wrap gap-1"><Badge tone={s.tone}>{s.label}</Badge><ConfidenceBadge value={h.confidence} /><Badge tone={h.businessImpact === "high" ? "red" : "amber"}>{h.businessImpact} impact</Badge>{h.editedByUser && <Badge tone="blue">Edited by you</Badge>}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Evidence</div><EvidenceList items={h.evidence} /></div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Missing evidence</div>
            <ul className="list-disc space-y-1 pl-5 text-sm">{h.missingEvidence.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        </div>

        {h.userFeedback && <p className="rounded-lg bg-canvas px-3 py-2 text-sm"><span className="font-medium">Your feedback:</span> {h.userFeedback}</p>}
        {h.clarifyingQuestions.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div className="font-medium">To resolve this I&apos;d like to know (added to the interview):</div>
            <ul className="mt-1 list-disc pl-5">{h.clarifyingQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}

        {canManage && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={busy && mode === null} disabled={busy} onClick={() => review("agree")}>Agree</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("partially_agree")}>Partially agree</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("disagree")}>Disagree</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setStatement(h.statement); setMode("edit"); }}>Edit hypothesis</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode("info")}>Add information</Button>
            </div>
            {mode && mode !== "info" && (
              <div className="space-y-2 rounded-lg border border-line p-3">
                {mode === "edit" && <Textarea rows={2} value={statement} onChange={(e) => setStatement(e.target.value)} />}
                <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={mode === "disagree" ? "What part of this hypothesis do you disagree with?" : mode === "partially_agree" ? "What would you change or add?" : "Why did you edit it? (optional)"} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
                  <Button size="sm" loading={busy} disabled={mode !== "edit" && !text.trim()}
                    onClick={() => review(mode, { ...(text.trim() ? { feedback: text.trim() } : {}), ...(mode === "edit" ? { statement } : {}) })}>Submit</Button>
                </div>
              </div>
            )}
            {mode === "info" && (
              <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-muted">
                Add facts in the Business, Customer, Data or Technology tabs (or answer more interview questions), then rebuild the diagnosis.
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
