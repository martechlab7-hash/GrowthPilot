"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Flag, ListChecks, Rocket, Sparkles } from "lucide-react";
import type { Pace, RoadmapTask } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Select } from "@/components/ui";
import { approvalWeeksFrom, schedule, weekToDate, type Schedule } from "@/engine/strategy/roadmap";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { HORIZON_LABEL, PACE_HINT, PACE_LABEL } from "./shared";

const PACES: Pace[] = ["aggressive", "balanced", "conservative"];
const STATUS: Record<RoadmapTask["status"], string> = { todo: "To do", doing: "In progress", done: "Done", blocked: "Blocked" };

export function StrategyRoadmap({ view, ctl, canManage, canContribute, go }: CaseTabProps) {
  const c = view.case;
  const s = c.strategy!;
  const [pace, setPace] = useState<Pace>(s.settings.pace);
  const approvalWeeks = approvalWeeksFrom(c.context.fields["operations.approval_cycle"]?.value);
  const startDate = (s.approval?.at ?? s.generatedAt ?? c.updatedAt).slice(0, 10);
  const plans = useMemo(
    () => (s.tasks.length ? PACES.map((p) => schedule(s.tasks, { pace: p, settings: s.settings, approvalWeeks, startDate })) : []),
    [s.tasks, s.settings, approvalWeeks, startDate],
  );
  const plan = plans.find((p) => p.pace === pace);
  const approved = s.recommendations.filter((r) => r.status === "approved").length;
  const build = () => ctl.run("Planning", "/strategy/plan");

  if (!s.tasks.length) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-8 w-8" />}
        title="Turn the strategy into an execution plan"
        description={!s.recommendations.length ? "Build the strategy first." : approved ? `${approved} approved recommendation(s) become a roadmap with owners, dependencies and gates, three budget scenarios, a KPI tree, experiments and a risk register.` : "No recommendations are approved yet, so every recommendation that isn't rejected will be planned. Approve the ones you want first for a tighter plan."}
        action={canManage && s.recommendations.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {!approved && <Button variant="outline" onClick={() => go("strategy" as never)}>Review recommendations</Button>}
            <Button loading={ctl.busy === "Planning"} onClick={build}><Sparkles className="h-4 w-4" /> Build roadmap, budget & KPIs</Button>
          </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Compare execution scenarios"
          description={`Same tasks, scheduled three ways. Aggressive only shortens parallel work when resources allow; approvals are never compressed; conservative adds pilot gates after launches. Horizon: ${HORIZON_LABEL[s.settings.horizon]}.`}
          action={canManage && <Button size="sm" variant="outline" loading={ctl.busy === "Planning"} onClick={build}>Rebuild plan</Button>}
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <button key={p.pace} type="button" aria-pressed={pace === p.pace} onClick={() => setPace(p.pace)}
              className={cn("rounded-xl border p-4 text-left transition", pace === p.pace ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15" : "border-line hover:border-line-strong")}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{PACE_LABEL[p.pace]}</span>
                {p.pace === s.settings.pace && <Badge tone="violet">Chosen</Badge>}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{Math.ceil(p.totalWeeks)} <span className="text-sm font-normal text-muted">weeks</span></div>
              <div className="text-xs text-muted">Ends {p.endDate}{p.firstLaunchWeek !== null ? ` · first launch ${weekToDate(p.startDate, p.firstLaunchWeek)}` : ""}</div>
              <div className="mt-2 text-xs text-muted">{PACE_HINT[p.pace]}</div>
              {p.pace === "aggressive" && Math.abs(p.totalWeeks - (plans.find((x) => x.pace === "balanced")?.totalWeeks ?? 0)) < 0.5 && (
                <div className="mt-2 text-xs text-muted">No faster than balanced: the critical path ({p.criticalPath.map((id) => p.tasks.find((t) => t.id === id)?.title ?? id).join(" → ")}) is sequential work or approvals, which are never compressed.</div>
              )}
              {p.issues.length > 0 && <div className="mt-2 flex items-start gap-1 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {p.issues.length} issue{p.issues.length === 1 ? "" : "s"}</div>}
            </button>
          ))}
        </CardBody>
      </Card>

      {plan && <Gantt plan={plan} />}

      {plan && (plan.issues.length > 0 || plan.tradeoffs.length > 0) && (
        <Card>
          <CardHeader title="Feasibility" description="Where the plan collides with the horizon or the target date, and what to trade off." />
          <CardBody className="space-y-3 text-sm">
            {plan.issues.map((i) => <p key={i} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{i}</p>)}
            {plan.tradeoffs.length > 0 && <ul className="list-disc space-y-1 pl-5">{plan.tradeoffs.map((t) => <li key={t}>{t}</li>)}</ul>}
            {plan.minimumViableLaunch.length > 0 && plan.tradeoffs.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted"><Rocket className="h-3.5 w-3.5" /> Minimum viable launch: {plan.minimumViableLaunch.map((id) => plan.tasks.find((t) => t.id === id)?.title ?? id).join(" → ")}</p>
            )}
          </CardBody>
        </Card>
      )}

      {plan && (
        <Card>
          <CardHeader title="Tasks" description="Owners, deliverables and status. Generated pilot gates come from the conservative plan." />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="pb-2 font-medium">Task</th><th className="pb-2 font-medium">Owner</th><th className="pb-2 font-medium">Dates</th><th className="pb-2 font-medium">Deliverable</th><th className="pb-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plan.tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">{t.title}{t.critical && <Badge tone="red">Critical path</Badge>}{t.launch && <Badge tone="violet"><Flag className="mr-0.5 inline h-3 w-3" />Launch</Badge>}{t.approval && <Badge>Needs approval</Badge>}</div>
                      <div className="text-xs text-muted">{t.workstream}{t.dependsOn.length ? ` · after ${t.dependsOn.map((d) => plan.tasks.find((x) => x.id === d)?.title ?? d).join(", ")}` : ""}</div>
                    </td>
                    <td className="py-2 pr-3">{t.owner}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted">{weekToDate(plan.startDate, t.start)} → {weekToDate(plan.startDate, t.end)}</td>
                    <td className="py-2 pr-3 text-muted">{t.deliverable}</td>
                    <td className="py-2">
                      {t.generated ? <span className="text-xs text-muted">Gate</span> : (
                        <Select aria-label={`Status of ${t.title}`} className={cn("h-8 w-32 text-xs", t.status === "done" && "text-emerald-700", t.status === "blocked" && "text-red-700")} value={t.status} disabled={!canContribute} onChange={(e) => ctl.run(`Task ${t.id}`, `/strategy/tasks/${t.id}`, { method: "PATCH", body: { status: e.target.value } })}>
                          {(Object.keys(STATUS) as RoadmapTask["status"][]).map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {s.first30Days.length > 0 && (
        <Card>
          <CardHeader title="First 30 days" />
          <CardBody><ol className="space-y-1.5 text-sm">{s.first30Days.map((x, i) => <li key={x} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">{i + 1}</span>{x}</li>)}</ol></CardBody>
        </Card>
      )}
    </div>
  );
}

const COLORS = ["bg-brand-500", "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-teal-500"];

function Gantt({ plan }: { plan: Schedule }) {
  const weeks = Math.max(1, Math.ceil(plan.totalWeeks));
  const workstreams = [...new Set(plan.tasks.map((t) => t.workstream))];
  const ticks = Array.from({ length: weeks + 1 }, (_, i) => i).filter((i) => weeks <= 16 || i % Math.ceil(weeks / 12) === 0);
  return (
    <Card>
      <CardHeader title={`${PACE_LABEL[plan.pace]} timeline`} description={`${plan.startDate} → ${plan.endDate}. Red outline: critical path. Hatched: pilot gates.`} />
      <CardBody className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="relative ml-56 h-6 border-b border-line text-[10px] text-subtle">
            {ticks.map((w) => <span key={w} className="absolute -translate-x-1/2" style={{ left: `${(w / weeks) * 100}%` }}>W{w}</span>)}
          </div>
          {workstreams.map((ws, wi) => (
            <div key={ws} className="border-b border-line/60 py-1.5 last:border-b-0">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted"><ListChecks className="h-3.5 w-3.5" /> {ws}</div>
              {plan.tasks.filter((t) => t.workstream === ws).map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-0.5">
                  <div className="w-[13.5rem] shrink-0 truncate pr-2 text-xs" title={t.title}>{t.title}</div>
                  <div className="relative h-5 flex-1 rounded bg-canvas">
                    <div
                      className={cn("absolute top-0 h-5 rounded text-[10px] font-medium leading-5 text-white", COLORS[wi % COLORS.length], t.critical && "ring-2 ring-red-500 ring-offset-1", t.generated && "bg-[repeating-linear-gradient(45deg,#64748b,#64748b_4px,#94a3b8_4px,#94a3b8_8px)]", t.status === "done" && "opacity-50")}
                      style={{ left: `${(t.start / weeks) * 100}%`, width: `${Math.max(1.5, ((t.end - t.start) / weeks) * 100)}%` }}
                      title={`${t.title}: week ${t.start} → ${t.end}`}
                    >
                      {t.launch && <Flag className="ml-1 mt-1 h-3 w-3" aria-label="Launch" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
