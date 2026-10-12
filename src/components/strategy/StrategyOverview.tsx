"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, CircleDashed, ShieldAlert, ShieldCheck } from "lucide-react";
import type { StrategySettings } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { evaluateStrategy } from "@/engine/strategy/evaluate";
import { strategyReadiness } from "@/engine/strategy/readiness";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { HORIZON_LABEL, PACE_HINT, PACE_LABEL, TYPE_LABEL, nextStrategyStep, type StrategyTab } from "./shared";

export function StrategyOverview({ view, ctl, canManage, go }: CaseTabProps) {
  const c = view.case;
  const s = c.strategy!;
  const next = nextStrategyStep(c, view.derived.readiness.ready);
  const readiness = useMemo(() => strategyReadiness(c.context), [c.context]);
  const checks = useMemo(() => evaluateStrategy(c), [c]);
  const [note, setNote] = useState("");
  const approve = () => ctl.run("Approving", "/strategy/approve", { body: note.trim() ? { note: note.trim() } : {} });

  const steps: { label: string; done: boolean; tab: StrategyTab }[] = [
    { label: "Interview", done: view.derived.readiness.ready || !!s.diagnosis, tab: "interview" },
    { label: "Diagnosis", done: !!s.diagnosis, tab: "diagnosis" },
    { label: "Strategy", done: s.recommendations.length > 0, tab: "strategy" },
    { label: "Panel & review", done: s.recommendations.some((r) => r.status === "approved"), tab: "strategy" },
    { label: "Roadmap & budget", done: s.tasks.length > 0, tab: "roadmap" },
    { label: "KPIs", done: s.kpis.length > 0, tab: "kpis" },
    { label: "Approved", done: s.status === "approved", tab: "report" },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-brand-50 via-white to-violet-50 px-6 py-5">
          <OwlSays size={72} mood={s.status === "approved" ? "delighted" : null}>{next.detail}</OwlSays>
          {next.approve && canManage ? (
            <Button loading={ctl.busy === "Approving"} onClick={approve}><BadgeCheck className="h-4 w-4" /> {next.label}</Button>
          ) : next.tab !== "overview" && (
            <Button onClick={() => go(next.tab as never)}>{next.label} <ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>
        <ol className="flex overflow-x-auto border-t border-line" aria-label="Strategy progress">
          {steps.map((st, i) => (
            <li key={st.label} className="min-w-[110px] flex-1 border-r border-line last:border-r-0">
              <button type="button" onClick={() => go(st.tab as never)} className="flex w-full items-center gap-2 px-3 py-3 text-left text-xs font-medium hover:bg-canvas">
                {st.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <CircleDashed className="h-4 w-4 shrink-0 text-subtle" />}
                <span className={st.done ? "text-ink" : "text-muted"}>{i + 1}. {st.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Strategy settings" description="Change pace, horizon or resources at any time; the roadmap and checks update instantly." />
          <CardBody className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="violet">{TYPE_LABEL[s.settings.type]}</Badge>
              <Badge>{cap(s.settings.scope)}</Badge>
              <Badge>{s.settings.competitor === "none" ? "No competitor research" : s.settings.competitor === "research" ? "Competitor research" : "Competitor research + comparison"}</Badge>
            </div>
            <SettingsForm settings={s.settings} disabled={!canManage || ctl.busy !== null} onSave={(patch) => ctl.run("Saving settings", "/strategy/settings", { method: "PATCH", body: patch })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Execution readiness" description="Scored from your interview answers. Missing answers lower the score." />
          <CardBody className="space-y-2.5">
            {readiness.map((r) => (
              <div key={r.area} title={r.missing.length ? `Missing: ${r.missing.join(", ")}` : undefined}>
                <div className="flex items-center justify-between text-sm"><span>{r.area}</span><span className="text-xs text-muted">{r.note} · <span className="tabular-nums">{r.score}</span></span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas">
                  <div className={cn("h-full rounded-full", r.score >= 70 ? "bg-emerald-500" : r.score >= 45 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${Math.max(3, r.score)}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {checks.length > 0 && (
        <Card>
          <CardHeader title="Quality checks" description="Run in code before you approve: completeness, specificity, budget arithmetic, timeline feasibility, channel rules, measurement and evidence." />
          <CardBody className="grid gap-2 md:grid-cols-2">
            {checks.map((q) => (
              <div key={q.id} className={cn("flex gap-2.5 rounded-xl border px-3 py-2 text-sm", q.ok ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/60")}>
                {q.ok ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                <div className="min-w-0"><div className="font-medium">{q.label}</div><div className="text-xs text-muted [overflow-wrap:anywhere]">{q.detail}</div></div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {canManage && s.tasks.length > 0 && (
        <Card>
          <CardHeader title={s.status === "approved" ? `Approved · version ${s.approval?.version}` : "Approve the strategy"} description={s.status === "approved" ? `Approved on ${s.approval?.at.slice(0, 10)}${s.approval?.note ? `: ${s.approval.note}` : ""}. Changes after approval create a new draft.` : "Saves a version of the full strategy (recommendations, roadmap, budget and KPIs) that you can share and track against."} />
          <CardBody className="space-y-3">
            {checks.some((q) => !q.ok) && s.status !== "approved" && <p className="text-sm text-amber-800">{checks.filter((q) => !q.ok).length} quality check(s) need review. You can still approve; they will be listed in the report.</p>}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1"><Label htmlFor="approval-note" hint="(optional)">Approval note</Label><Textarea id="approval-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Approved by the CMO, budget confirmed by finance" /></div>
              <Button loading={ctl.busy === "Approving"} onClick={approve}>
                <BadgeCheck className="h-4 w-4" /> {s.status === "approved" ? "Approve again as a new version" : "Approve strategy"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1).replace(/_/g, " ");

function SettingsForm({ settings, disabled, onSave }: { settings: StrategySettings; disabled: boolean; onSave: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="pace">Execution pace</Label>
        <Select id="pace" value={settings.pace} disabled={disabled} onChange={(e) => onSave({ pace: e.target.value })}>
          {(["aggressive", "balanced", "conservative"] as const).map((p) => <option key={p} value={p}>{PACE_LABEL[p]}: {PACE_HINT[p]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="horizon">Planning horizon</Label>
        <Select id="horizon" value={settings.horizon} disabled={disabled} onChange={(e) => onSave({ horizon: e.target.value })}>
          {(Object.keys(HORIZON_LABEL) as StrategySettings["horizon"][]).map((h) => <option key={h} value={h}>{HORIZON_LABEL[h]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="resources">Resources</Label>
        <Select id="resources" value={settings.resources} disabled={disabled} onChange={(e) => onSave({ resources: e.target.value })}>
          <option value="existing">Existing team & tools only</option>
          <option value="limited">Limited hiring, agency or tools</option>
          <option value="flexible">Flexible if the case supports it</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="launch" hint="(optional)">Target launch date</Label>
        <Input id="launch" type="date" disabled={disabled} defaultValue={settings.launchDate ?? ""} onBlur={(e) => e.target.value !== (settings.launchDate ?? "") && onSave({ launchDate: e.target.value || null })} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="competitor">Competitor intelligence</Label>
        <Select id="competitor" value={settings.competitor} disabled={disabled} onChange={(e) => onSave({ competitor: e.target.value })}>
          <option value="none">No competitor research</option>
          <option value="research">Research observable activity, no comparisons</option>
          <option value="compare">Research and compare with us</option>
        </Select>
      </div>
    </div>
  );
}
