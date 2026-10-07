"use client";

import { channelOf, goalOf } from "@/engine/caseProfile";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Cpu, Database, FileText, Gauge, History, LayoutDashboard, Lightbulb,
  LineChart, Map as MapIcon, MessagesSquare, RefreshCw, Route, Stethoscope, Target, Users,
} from "lucide-react";
import type { Case } from "@/domain/types";
import { Badge, Button, ErrorNote, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/client/auth";
import { STATUS_LABEL, STATUS_TONE, industryName, timeAgo } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { useCase, type CaseView } from "./useCase";
import { CaseChat } from "./CaseChat";
import { Overview } from "./Overview";
import { Interview } from "./Interview";
import { ContextView } from "./ContextView";
import { DiagnosisView } from "./DiagnosisView";
import { Hypotheses } from "./Hypotheses";
import { Recommendations } from "./Recommendations";
import { ActivationView, MeasurementView } from "./PlanViews";
import { EconomicsView } from "./EconomicsView";
import { RoadmapView, ReportView } from "./ReportView";
import { HistoryView } from "./HistoryView";
import { ActivityPanel } from "./ActivityPanel";
import { AiModelPicker } from "./AiModelPicker";

export const TABS = [
  ["overview", "Overview"],
  ["interview", "Interview"],
  ["business", "Business"],
  ["customer", "Customer"],
  ["data", "Data"],
  ["technology", "Technology"],
  ["diagnosis", "Diagnosis"],
  ["hypotheses", "Hypotheses"],
  ["recommendations", "Recommendations"],
  ["activation", "Activation"],
  ["measurement", "Measurement"],
  ["economics", "Economics"],
  ["roadmap", "Roadmap"],
  ["report", "Report"],
  ["history", "History"],
] as const;
export type Tab = (typeof TABS)[number][0];

const GOAL_BADGE = { decline: "Fix a drop", growth: "Growth target", both: "Recover, then grow" } as const;
const CHANNEL_BADGE = { offline: "Offline sales", online: "Online sales", omni: "Online + offline" } as const;

export interface CaseTabProps {
  view: CaseView;
  ctl: ReturnType<typeof useCase>;
  canManage: boolean;
  canContribute: boolean;
  go: (tab: Tab) => void;
}

/** The single next decision or action the user should take (spec §66). */
export function nextAction(c: Case, ready: boolean): { label: string; tab: Tab; detail: string } {
  if (!c.diagnosis && !ready) return { label: "Continue the interview", tab: "interview", detail: "Critical information is still missing." };
  if (!c.diagnosis) return { label: "Run the diagnosis", tab: "diagnosis", detail: "Discovery has enough information to diagnose." };
  if (!c.hypotheses.some((h) => h.status === "proposed" || h.status === "agreed" || h.status === "partially_agreed")) {
    return { label: c.hypotheses.length ? "Rebuild hypotheses with your feedback" : "Generate hypotheses", tab: "hypotheses", detail: "Hypotheses translate the diagnosis into testable root causes." };
  }
  if (c.hypotheses.some((h) => h.status === "proposed")) return { label: "Review hypotheses", tab: "hypotheses", detail: "Your validation is required before the strategy is built." };
  if (!c.recommendations.length) return { label: "Build recommendations", tab: "recommendations", detail: "Hypotheses are validated." };
  if (!c.journeys.length || !c.measurement) return { label: "Design activation & measurement", tab: "activation", detail: "Turn recommendations into journeys and KPIs." };
  if (!c.economics) return { label: "Model the economics", tab: "economics", detail: "Quantify revenue vs profit impact." };
  if (!c.report) return { label: "Generate the strategy report", tab: "report", detail: "Everything is in place." };
  return { label: "View the report", tab: "report", detail: "Your strategy is ready." };
}

export function Workspace({ id }: { id: string }) {
  const ctl = useCase(id);
  const { me } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS.some(([t]) => t === params.get("tab")) ? params.get("tab") : "overview") as Tab;
  const go = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  if (!ctl.view) {
    return ctl.error ? (
      <div className="space-y-4"><ErrorNote error={ctl.error} /><Link href="/cases" className="text-sm text-brand-600">Back to cases</Link></div>
    ) : (
      <Spinner label="Opening case…" />
    );
  }

  const { case: c, derived } = ctl.view;
  const role = me?.onboarded ? me.profile.role : "viewer";
  const canManage = ["owner", "admin", "strategist"].includes(role);
  const canContribute = canManage || role === "analyst";
  const next = nextAction(c, derived.readiness.ready);
  const props: CaseTabProps = { view: ctl.view, ctl, canManage, canContribute, go };

  /** Re-run the operation that failed, with the currently selected AI model. */
  async function retry(operation: string) {
    go(resumeTab(operation));
    switch (operation) {
      case "diagnose":
        if ((await ctl.run("Diagnosing", "/diagnose", { body: { override: true } })) && !c.hypotheses.some((h) => h.status === "proposed")) {
          if (await ctl.run("Generating hypotheses", "/hypotheses")) go("hypotheses");
        }
        break;
      case "hypotheses":
        await ctl.run("Generating hypotheses", "/hypotheses");
        break;
      case "recommendations":
        await ctl.run("Building recommendations", "/recommendations");
        break;
      case "plan":
        await ctl.run("Designing plan", "/plan");
        break;
      case "report":
        await ctl.run("Writing report", "/report");
        break;
      case "interview":
        await ctl.run("Thinking", "/interview", { body: { adaptive: true } });
        break;
      default:
        // e.g. hypothesis refinement: the user re-submits their review on the Hypotheses tab.
        await ctl.run("Dismissing", "", { method: "PATCH", body: { dismissPending: true } });
    }
  }

  return (
    <div className="mx-auto max-w-7xl pb-28">
      {/* Header */}
      <div className="no-print mb-5 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <ProgressRing value={c.progress} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                <span>{industryName(c.industryId)}</span>
                {goalOf(c.context) && <Badge tone="violet">{GOAL_BADGE[goalOf(c.context)!]}</Badge>}
                {channelOf(c.context) && <Badge>{CHANNEL_BADGE[channelOf(c.context)!]}</Badge>}
                <span aria-hidden>·</span>
                <span aria-live="polite" className={cn(ctl.busy && "font-medium text-brand-600")}>{ctl.busy ? `${ctl.busy}…` : ctl.savedAt ? `Saved ${timeAgo(ctl.savedAt)}` : `Updated ${timeAgo(c.updatedAt)}`}</span>
              </div>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{c.name}</h1>
              <p className="mt-1 line-clamp-1 max-w-2xl text-sm text-muted">{c.problemStatement}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:flex-col xl:items-end">
            {canContribute && <AiModelPicker />}
            {tab !== next.tab && (
              <button onClick={() => go(next.tab)} className="group flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2 text-left text-sm text-white transition hover:bg-ink/85">
                <span><span className="block text-[11px] uppercase tracking-wider text-white/60">Next step</span>{next.label}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
        <StageStepper stages={derived.stages} />
      </div>

      {c.pendingOperation && !ctl.busy && (
        <div className="no-print mb-4 flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex min-w-0 items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="[overflow-wrap:anywhere]">{c.pendingOperation.message}</span></span>
          <div className="flex gap-2">
            {canManage && <Button size="sm" onClick={() => retry(c.pendingOperation!.operation)}>Retry now</Button>}
            <Button size="sm" variant="ghost" onClick={() => ctl.run("Dismissing", "", { method: "PATCH", body: { dismissPending: true } })}>Dismiss</Button>
          </div>
        </div>
      )}
      <div className="no-print"><ActivityPanel caseId={c.id} busy={ctl.busy} /></div>
      {c.analysisStale && (
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> New information was added after the diagnosis. Re-running it may change the conclusions.</span>
          {canManage && <Button size="sm" variant="outline" loading={ctl.busy === "Diagnosing"} onClick={() => ctl.run("Diagnosing", "/diagnose", { body: { override: true } })}>Re-run diagnosis</Button>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] print:block">
        <aside className="no-print">
          <nav className="sticky top-20 space-y-4 rounded-2xl border border-line bg-white p-2.5 shadow-card" aria-label="Case sections">
            {TAB_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{g.title}</div>
                {g.tabs.map((t) => {
                  const Icon = TAB_ICONS[t];
                  const label = TABS.find(([k]) => k === t)![1];
                  const badge = tabBadge(t, c);
                  return (
                    <button
                      key={t}
                      onClick={() => go(t)}
                      aria-current={t === tab ? "page" : undefined}
                      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition", t === tab ? "bg-brand-50 font-medium text-brand" : "text-slate-600 hover:bg-canvas hover:text-ink")}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", t === tab ? "text-brand-600" : "text-subtle")} />
                      <span className="flex-1">{label}</span>
                      {badge}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 animate-fade-in" key={tab}>
          {tab === "overview" && <Overview {...props} />}
          {tab === "interview" && <Interview {...props} />}
          {(tab === "business" || tab === "customer" || tab === "data" || tab === "technology") && <ContextView {...props} stage={tab} />}
          {tab === "diagnosis" && <DiagnosisView {...props} />}
          {tab === "hypotheses" && <Hypotheses {...props} />}
          {tab === "recommendations" && <Recommendations {...props} />}
          {tab === "activation" && <ActivationView {...props} />}
          {tab === "measurement" && <MeasurementView {...props} />}
          {tab === "economics" && <EconomicsView {...props} />}
          {tab === "roadmap" && <RoadmapView {...props} />}
          {tab === "report" && <ReportView {...props} />}
          {tab === "history" && <HistoryView {...props} />}
        </section>
      </div>

      {/* Errors surface where the user is, not only at the top of the page. */}
      {ctl.error && (
        <div role="alert" className="no-print fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[min(640px,calc(100%-2rem))] animate-slide-up items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm shadow-pop">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span className="flex-1 break-words text-red-800">{ctl.error}</span>
          <button className="text-xs font-medium text-muted hover:text-ink" onClick={() => ctl.setError(null)}>Dismiss</button>
        </div>
      )}

      <CaseChat caseId={c.id} available={!!c.report} />
    </div>
  );
}

const TAB_GROUPS: { title: string; tabs: Tab[] }[] = [
  { title: "Discover", tabs: ["overview", "interview", "business", "customer", "data", "technology"] },
  { title: "Diagnose", tabs: ["diagnosis", "hypotheses"] },
  { title: "Strategy", tabs: ["recommendations", "activation", "measurement", "economics", "roadmap"] },
  { title: "Deliver", tabs: ["report", "history"] },
];

const TAB_ICONS: Record<Tab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  interview: MessagesSquare,
  business: Building2,
  customer: Users,
  data: Database,
  technology: Cpu,
  diagnosis: Stethoscope,
  hypotheses: Lightbulb,
  recommendations: Target,
  activation: Route,
  measurement: Gauge,
  economics: LineChart,
  roadmap: MapIcon,
  report: FileText,
  history: History,
};

function tabBadge(t: Tab, c: Case) {
  if (t === "hypotheses") {
    const pending = c.hypotheses.filter((h) => h.status === "proposed").length;
    if (pending) return <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{pending}</span>;
    if (c.hypotheses.length) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
  if (t === "recommendations" && c.recommendations.length) return <span className="text-[11px] tabular-nums text-subtle">{c.recommendations.length}</span>;
  if (t === "report" && c.report) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  return null;
}

function ProgressRing({ value }: { value: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0" role="img" aria-label={`Progress ${value}%`}>
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#eef2ff" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="url(#gp-ring)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-700" />
        <defs>
          <linearGradient id="gp-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

const SHORT_STAGE: Record<string, string> = {
  business: "Business", diagnosis: "Diagnosis", customer: "Customer", data: "Data",
  technology: "Technology", activation: "Activation", measurement: "Measurement", economics: "Economics",
};

function StageStepper({ stages }: { stages: CaseView["derived"]["stages"] }) {
  return (
    <ol className="flex overflow-x-auto border-t border-line bg-canvas/60" aria-label="B-D-C-D-T-A-M-E progress">
      {stages.map((s, i) => (
        <li key={s.stage} className="min-w-[104px] flex-1 border-r border-line px-3 py-2.5 last:border-r-0" title={`${s.label}: ${s.percent}%`}>
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px]", s.state === "complete" ? "bg-emerald-500 text-white" : s.state === "in_progress" ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500")}>
              {s.state === "complete" ? "✓" : "BDCDTAME"[i]}
            </span>
            <span className={cn(s.state === "pending" ? "text-subtle" : "text-ink")}>{SHORT_STAGE[s.stage] ?? s.label}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
            <div className={cn("h-full rounded-full transition-all duration-500", s.state === "complete" ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${s.percent}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function resumeTab(op: string): Tab {
  if (op === "diagnose") return "diagnosis";
  if (op === "hypotheses" || op === "refine_hypothesis") return "hypotheses";
  if (op === "recommendations") return "recommendations";
  if (op === "plan") return "activation";
  if (op === "report") return "report";
  return "interview";
}
