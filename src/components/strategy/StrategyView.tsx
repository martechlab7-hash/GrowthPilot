"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Compass, Cpu, Megaphone, RotateCcw, Sparkles, Swords, Target, X, Zap } from "lucide-react";
import type { StrategyRecommendation } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Textarea } from "@/components/ui";
import { DebateThread, PanelLineup } from "@/components/case/DebatePanel";
import { STRATEGY_CHALLENGERS } from "@/knowledge/debatePanel";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { EvidenceBadge, cap } from "./shared";

const VERDICT = { survives: ["Survives the panel", "green"], weakened: ["Weakened by the panel", "amber"], refuted: ["Refuted by the panel", "red"] } as const;

export function StrategyView({ view, ctl, canManage, go }: CaseTabProps) {
  const c = view.case;
  const s = c.strategy!;
  const debating = s.debateStatus === "pending";
  const reload = ctl.reload;
  const polls = useRef(0);
  useEffect(() => {
    if (!debating) return;
    const t = setInterval(() => {
      if (++polls.current > 60) return clearInterval(t);
      void reload();
    }, 4000);
    return () => clearInterval(t);
  }, [debating, reload]);

  if (!s.recommendations.length) {
    return (
      <EmptyState
        icon={<Compass className="h-8 w-8" />}
        title="Build the strategy"
        description={s.diagnosis ? "Strategic pillars, prioritised recommendations, channel plan, messaging" + (s.settings.type === "gtm" || s.settings.type === "launch" ? ", GTM plan" : "") + " and lifecycle journeys, built from the diagnosis. The devil's-advocate panel then attacks every recommendation." : "The diagnosis runs first, then the strategy is built from it."}
        action={canManage && <Button loading={ctl.busy === "Building strategy"} onClick={() => ctl.run("Building strategy", "/strategy/build")}><Sparkles className="h-4 w-4" /> Build the strategy</Button>}
      />
    );
  }

  const live = s.recommendations.filter((r) => r.status !== "rejected");
  const rejected = s.recommendations.filter((r) => r.status === "rejected");
  const approved = s.recommendations.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-5">
      {s.executive && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-50 via-white to-violet-50 px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">Strategic direction</div>
            <p className="mt-1 text-lg font-semibold leading-snug tracking-tight">{s.executive.direction}</p>
            <p className="mt-2 text-sm text-muted">{s.executive.situation} {s.executive.outcomes}</p>
          </div>
          {s.pillars.length > 0 && (
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.pillars.map((p, i) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle"><Target className="h-3.5 w-3.5 text-brand-600" /> Pillar {i + 1}</div>
                  <div className="mt-1 font-semibold">{p.title}</div>
                  <p className="mt-1 text-sm text-muted">{p.objective}</p>
                  <p className="mt-1.5 text-xs"><span className="font-medium">KPI:</span> {p.kpi}</p>
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      )}

      <Card>
        <CardHeader
          title={`Prioritised recommendations (${live.length})`}
          description={`Ranked by (impact × confidence × fit) ÷ (effort × risk), a ranking aid, not a forecast. ${approved ? `${approved} approved.` : "Approve the ones you want in the roadmap."}`}
          action={canManage && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={debating} loading={ctl.busy === "Debating"} onClick={() => ctl.run("Debating", "/strategy/debate")}><Swords className="h-3.5 w-3.5" /> {s.debateStatus === "done" ? "Debate again" : "Run the debate"}</Button>
              <Button size="sm" variant="ghost" loading={ctl.busy === "Building strategy"} onClick={() => ctl.run("Building strategy", "/strategy/build")}><RotateCcw className="h-3.5 w-3.5" /> Rebuild</Button>
            </div>
          )}
        />
        <CardBody className="space-y-3">
          {debating && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
              <PanelLineup busy panel={STRATEGY_CHALLENGERS} size={34} /> The devil&apos;s-advocate panel is attacking each recommendation…
            </div>
          )}
          {s.debateStatus === "failed" && <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">The debate couldn&apos;t run (the AI provider didn&apos;t respond). Use “Run the debate” to try again.</p>}
          {live.map((r) => <RecommendationCard key={r.id} r={r} pillar={s.pillars.find((p) => p.id === r.pillarId)?.title} canManage={canManage} debating={debating} ctl={ctl} />)}
          {rejected.length > 0 && (
            <details className="rounded-xl border border-dashed border-line-strong px-4 py-2 text-sm">
              <summary className="cursor-pointer text-muted">Rejected ({rejected.length}): kept out of the plan and not re-proposed</summary>
              <ul className="mt-2 space-y-1.5">
                {rejected.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span><span className="font-medium">{r.title}</span>{r.feedback && <span className="text-muted"> · {r.feedback}</span>}</span>
                    {canManage && <Button size="sm" variant="ghost" onClick={() => ctl.run(`Reviewing ${r.id}`, `/strategy/recommendations/${r.id}`, { body: { action: "reset" } })}>Restore</Button>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {approved > 0 && !s.tasks.length && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm">
              <span>{approved} recommendation(s) approved. Next: turn them into a roadmap, budget scenarios and KPIs.</span>
              <Button size="sm" onClick={() => go("roadmap")}>Go to roadmap</Button>
            </div>
          )}
        </CardBody>
      </Card>

      {s.channelPlan.length > 0 && (
        <Card>
          <CardHeader title="Channel strategy" description="What to keep, optimise, test, add or drop, and each channel's role in the funnel." />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Channel</th><th className="pb-2 font-medium">Plan</th><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium">Funnel stage</th><th className="pb-2 font-medium">KPI</th></tr></thead>
              <tbody className="divide-y divide-line">
                {s.channelPlan.map((ch) => (
                  <tr key={ch.channel} title={ch.rationale}>
                    <td className="py-2 pr-3 font-medium">{ch.channel}</td>
                    <td className="py-2 pr-3"><Badge tone={ch.status === "new" ? "violet" : ch.status === "exclude" ? "red" : ch.status === "test" ? "amber" : ch.status === "optimize" ? "blue" : "green"}>{cap(ch.status)}</Badge></td>
                    <td className="py-2 pr-3">{ch.role}</td>
                    <td className="py-2 pr-3 text-muted">{ch.funnelStage}</td>
                    <td className="py-2">{ch.kpi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {s.messaging && (
        <Card>
          <CardHeader title="Positioning & messaging" />
          <CardBody className="space-y-4 text-sm">
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3"><span className="font-semibold text-brand-700">Value proposition: </span>{s.messaging.valueProposition}</div>
            {s.messaging.audienceValueProps.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">{s.messaging.audienceValueProps.map((v) => <div key={v.segment} className="rounded-lg border border-line px-3 py-2"><div className="text-xs font-semibold text-muted">{v.segment}</div>{v.proposition}</div>)}</div>
            )}
            {s.messaging.contentPillars.length > 0 && <div className="flex flex-wrap gap-1.5">{s.messaging.contentPillars.map((p) => <Badge key={p}>{p}</Badge>)}</div>}
            {s.messaging.campaignConcepts.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {s.messaging.campaignConcepts.map((k) => (
                  <div key={k.name} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-1.5 font-semibold"><Megaphone className="h-3.5 w-3.5 text-brand-600" /> {k.name}</div>
                    <p className="mt-1">{k.idea}</p>
                    <p className="mt-1 text-xs text-muted">{k.audience} · {k.channels.join(", ")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {s.gtm && (
        <Card>
          <CardHeader title="Go-to-market plan" description={s.gtm.positioning} />
          <CardBody className="space-y-4 text-sm">
            <p><span className="font-medium">Target segments:</span> {s.gtm.targetSegments.join(", ")} · <span className="font-medium">Offer:</span> {s.gtm.offer}</p>
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {s.gtm.phases.map((p, i) => (
                <li key={p.name} className="relative rounded-xl border border-line p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Phase {i + 1}</div>
                  <div className="font-semibold">{p.name}</div>
                  <p className="mt-1 text-muted">{p.goal}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">{p.activities.map((a) => <li key={a}>{a}</li>)}</ul>
                  <p className="mt-2 text-xs"><span className="font-medium">Move on when:</span> {p.exitCriteria}</p>
                </li>
              ))}
            </ol>
            {s.gtm.salesEnablement.length > 0 && <p><span className="font-medium">Sales enablement:</span> {s.gtm.salesEnablement.join(" · ")}</p>}
          </CardBody>
        </Card>
      )}

      {s.lifecycle.length > 0 && (
        <Card>
          <CardHeader title="CRM & lifecycle journeys" />
          <CardBody className="grid gap-2 md:grid-cols-2">
            {s.lifecycle.map((l, i) => (
              <div key={i} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">{l.journey}</span><Badge>{cap(l.stage)}</Badge></div>
                <p className="mt-1 text-muted">Trigger: {l.trigger}</p>
                <p className="mt-0.5 text-xs">{l.channels.join(", ")} · KPI: {l.kpi}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {s.openQuestions.length > 0 && (
        <Card>
          <CardHeader title="Open questions & assumptions to validate" />
          <CardBody><ul className="list-disc space-y-1 pl-5 text-sm">{s.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul></CardBody>
        </Card>
      )}
    </div>
  );
}

function RecommendationCard({ r, pillar, canManage, debating, ctl }: { r: StrategyRecommendation; pillar?: string; canManage: boolean; debating: boolean; ctl: CaseTabProps["ctl"] }) {
  const [open, setOpen] = useState(r.rank <= 1);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const busy = ctl.busy === `Reviewing ${r.id}`;
  const review = (action: "approve" | "reject" | "reset", feedback?: string) => ctl.run(`Reviewing ${r.id}`, `/strategy/recommendations/${r.id}`, { body: { action, ...(feedback ? { feedback } : {}) } });
  const verdict = r.debate ? VERDICT[r.debate.verdict.outcome] : null;
  const fields: [string, string][] = [
    ["Problem", r.problem], ["Evidence", r.evidence], ["Root cause", r.rootCause], ["Why this, not alternatives", r.whyPrioritized],
    ["Audience", r.audience], ["Channels", r.channels.join(", ")], ["Owner", r.owner], ["Timeline", r.timeline],
    ["Budget & effort", r.budget], ["KPI", r.kpi], ["Success criteria", r.successCriteria], ["Dependencies", r.dependencies.join("; ") || "None"],
    ["Risks", r.risks.join("; ") || "None"], ["Fallback if it fails", r.fallback], ["Validate with", r.validateWith],
  ];

  return (
    <div role="article" aria-label={r.title} className={cn("rounded-2xl border bg-white transition", r.status === "approved" ? "border-emerald-200 ring-1 ring-emerald-100" : "border-line")}>
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-semibold text-white">{r.rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.title}</span>
            {r.status === "approved" && <Badge tone="green">Approved</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge tone="violet">Priority {r.priority}</Badge>
            {r.quickWin && <Badge tone="green"><Zap className="mr-0.5 inline h-3 w-3" />Quick win</Badge>}
            {r.needsNewTech && <Badge tone="amber"><Cpu className="mr-0.5 inline h-3 w-3" />New technology</Badge>}
            <EvidenceBadge kind={r.evidenceKind} />
            <Badge>Confidence {Math.round(r.confidence * 100)}%</Badge>
            {verdict && <Badge tone={verdict[1]}>{verdict[0]}</Badge>}
            {pillar && <span className="text-muted">· {pillar}</span>}
          </div>
          <p className="mt-2 text-sm">{r.action}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {r.status !== "approved" ? <Button size="sm" variant="outline" loading={busy} onClick={() => review("approve")}><Check className="h-3.5 w-3.5" /> Approve</Button> : <Button size="sm" variant="ghost" loading={busy} onClick={() => review("reset")}>Undo</Button>}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(!rejecting)}><X className="h-3.5 w-3.5" /> Reject</Button>
          </div>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-end gap-2 border-t border-line px-4 py-3">
          <Textarea rows={2} className="min-w-[16rem] flex-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? The next version won't repeat it." aria-label="Reason for rejecting" />
          <Button size="sm" variant="danger" disabled={!reason.trim()} loading={busy} onClick={async () => (await review("reject", reason.trim())) && setRejecting(false)}>Reject</Button>
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-1.5 border-t border-line px-4 py-2 text-xs font-medium text-muted hover:text-ink">
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} /> {open ? "Hide" : "Show"} the full plan and the devil&apos;s-advocate debate
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            {fields.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-subtle">{k}</dt><dd className="[overflow-wrap:anywhere]">{v}</dd></div>)}
          </dl>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {(["impact", "effort", "risk", "strategicFit"] as const).map((k) => <span key={k}>{k === "strategicFit" ? "Strategic fit" : cap(k)} <span className="font-semibold text-ink tabular-nums">{r[k]}/5</span></span>)}
          </div>
          <div className="rounded-xl border border-line p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Swords className="h-4 w-4 text-brand-600" /> Devil&apos;s-advocate panel</div>
            <DebateThread d={r.debate} debating={debating} subject="recommendation" panel={STRATEGY_CHALLENGERS} />
          </div>
        </div>
      )}
    </div>
  );
}
