"use client";

import { OutcomeTracker } from "./OutcomeTracker";
import { CommentThread } from "./CommentThread";
import { useState } from "react";
import { Lock, Target } from "lucide-react";
import type { Recommendation } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, ConfidenceBadge, EmptyState, Input, KindBadge, Label, PriorityBadge } from "@/components/ui";
import { PriorityMatrix } from "@/components/charts";
import { EvidenceList } from "./DiagnosisView";
import type { CaseTabProps } from "./Workspace";

export function Recommendations({ view, ctl, canManage, go }: CaseTabProps) {
  const { case: c } = view;
  const pending = c.hypotheses.filter((h) => h.status === "proposed").length;
  const anyAgreed = c.hypotheses.some((h) => h.status === "agreed" || h.status === "partially_agreed");

  if (!c.recommendations.length) {
    const open = c.hypotheses.length > 0 && pending === 0 && anyAgreed;
    return (
      <EmptyState
        icon={open ? <Target className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        title={open ? "Ready to build the strategy" : "Hypothesis approval required"}
        description={open ? "Recommendations will address only the hypotheses you validated." : "The strategy is built only after you review the hypotheses."}
        action={open ? canManage && <Button loading={ctl.busy === "Building recommendations"} onClick={() => ctl.run("Building recommendations", "/recommendations")}>Build recommendations</Button> : <Button onClick={() => go("hypotheses")}>Review hypotheses</Button>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Prioritisation matrix" description="Priority score = Impact × Confidence × Strategic Fit ÷ Effort. P0 requires value within 12 weeks." />
        <CardBody>
          <PriorityMatrix recommendations={c.recommendations} />
        </CardBody>
      </Card>
      {c.recommendations.map((r, i) => <RecommendationCard key={r.id} r={r} index={i + 1} ctl={ctl} canManage={canManage} hypotheses={c.hypotheses.map((h) => ({ id: h.id, statement: h.statement }))} comments={c.comments ?? []} />)}
      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" loading={ctl.busy === "Building recommendations"} onClick={() => ctl.run("Building recommendations", "/recommendations")}>Regenerate</Button>
          <Button loading={ctl.busy === "Designing plan"} onClick={async () => (await ctl.run("Designing plan", "/plan")) && go("activation")}>
            {c.journeys.length ? "Redesign activation & measurement" : "Design activation & measurement"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div><div className="mt-1 text-sm">{children}</div></div>;
}

function RecommendationCard({ r, index, ctl, canManage, hypotheses, comments }: { r: Recommendation; index: number; ctl: CaseTabProps["ctl"]; canManage: boolean; hypotheses: { id: string; statement: string }[]; comments: NonNullable<CaseTabProps["view"]["case"]["comments"]> }) {
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState({ impactScore: r.impactScore, effortScore: r.effortScore, confidence: r.confidence, strategicFit: r.strategicFit, timeToValueWeeks: r.timeToValueWeeks });
  const linked = hypotheses.filter((h) => r.hypothesisIds.includes(h.id));
  const list = (xs: string[]) => (xs.length ? xs.join(", ") : "—");

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><PriorityBadge priority={r.priority} /><span className="text-xs text-muted">#{index} · score {r.priorityScore}</span><KindBadge kind="recommendation" /></div>
            <h3 className="mt-1.5 text-base font-semibold">{r.title}</h3>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge>Impact {r.impactScore}/5</Badge><Badge>Effort {r.effortScore}/5</Badge><Badge>Fit {r.strategicFit}/5</Badge><ConfidenceBadge value={r.confidence} />
          </div>
        </div>
        <p className="text-sm"><span className="font-medium">Why: </span>{r.why}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Problem addressed">{r.problemAddressed}</Row>
          <Row label="Target customer">{r.targetCustomer}</Row>
          <Row label="Expected impact">{r.expectedImpact}{r.expectedLiftPct !== undefined && <span className="text-muted"> (assumed lift {r.expectedLiftPct}%)</span>}</Row>
          <Row label="Required data">{list(r.requiredData)}</Row>
          <Row label="Required technology">{list(r.requiredTechnology)}</Row>
          <Row label="Activation">{r.activation.join(" → ") || "—"}</Row>
          <Row label="Measurement">{list(r.measurement)}</Row>
          <Row label="Cost / complexity / time to value">{r.cost} / {r.complexity} / {r.timeToValueWeeks} weeks</Row>
          <Row label="Dependencies">{list(r.dependencies)}</Row>
          <Row label="Risks">{list(r.risks)}</Row>
          <Row label="Addresses hypotheses">{linked.length ? linked.map((h) => h.statement).join(" · ") : "—"}</Row>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Evidence & assumptions</summary>
          <div className="mt-2 space-y-2">
            <EvidenceList items={r.evidence} />
            {r.assumptions.map((a) => <div key={a} className="flex items-start gap-2 text-sm"><KindBadge kind="assumption" /> {a}</div>)}
          </div>
        </details>
        <OutcomeTracker r={r} ctl={ctl} canEdit={canManage} />
        <CommentThread target="recommendation" targetId={r.id} comments={comments} ctl={ctl} />
        {canManage && (editing ? (
          <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-6 sm:items-end">
            {([["impactScore", "Impact (1–5)", 1, 5, 1], ["effortScore", "Effort (1–5)", 1, 5, 1], ["strategicFit", "Fit (1–5)", 1, 5, 1], ["confidence", "Confidence (0–1)", 0, 1, 0.05], ["timeToValueWeeks", "Weeks to value", 0, 260, 1]] as const).map(([k, label, min, max, step]) => (
              <div key={k}><Label>{label}</Label><Input type="number" min={min} max={max} step={step} value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })} /></div>
            ))}
            <Button size="sm" loading={ctl.busy === `Rescoring ${r.id}`} onClick={async () => (await ctl.run(`Rescoring ${r.id}`, `/recommendations/${r.id}`, { method: "PATCH", body: scores })) && setEditing(false)}>Save</Button>
          </div>
        ) : (
          <button className="text-xs font-medium text-brand-600" onClick={() => setEditing(true)}>Challenge the scoring</button>
        ))}
      </CardBody>
    </Card>
  );
}
