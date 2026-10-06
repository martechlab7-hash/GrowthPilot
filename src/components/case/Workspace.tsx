"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, CircleDot, RefreshCw } from "lucide-react";
import type { Case } from "@/domain/types";
import { Badge, Button, ErrorNote, Progress, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/client/auth";
import { STATUS_LABEL, STATUS_TONE, industryName, timeAgo } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { useCase, type CaseView } from "./useCase";
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
    <div className="mx-auto max-w-7xl">
      <div className="no-print mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/cases" className="text-xs text-muted hover:text-ink">← Cases</Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{c.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
            <span>{industryName(c.industryId)}</span>
            <span>·</span>
            <span aria-live="polite">{ctl.busy ? `${ctl.busy}…` : ctl.savedAt ? `Saved ${timeAgo(ctl.savedAt)}` : `Updated ${timeAgo(c.updatedAt)}`}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="w-64">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>Progress</span><span className="tabular-nums">{c.progress}%</span></div>
            <Progress value={c.progress} />
          </div>
          {canContribute && <AiModelPicker />}
        </div>
      </div>

      {c.pendingOperation && !ctl.busy && (
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex min-w-0 items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-words">{c.pendingOperation.message}</span></span>
          <div className="flex gap-2">
            {canManage && <Button size="sm" onClick={() => retry(c.pendingOperation!.operation)}>Retry now</Button>}
            <Button size="sm" variant="ghost" onClick={() => ctl.run("Dismissing", "", { method: "PATCH", body: { dismissPending: true } })}>Dismiss</Button>
          </div>
        </div>
      )}
      <div className="no-print"><ActivityPanel caseId={c.id} busy={ctl.busy} /></div>
      {c.analysisStale && (
        <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> New information was added after the diagnosis. Re-running it may change the conclusions.</span>
          {canManage && <Button size="sm" variant="outline" loading={ctl.busy === "Diagnosing"} onClick={() => ctl.run("Diagnosing", "/diagnose", { body: { override: true } })}>Re-run diagnosis</Button>}
        </div>
      )}
      <ErrorNote error={ctl.error} />

      <div className="mt-4 grid gap-6 lg:grid-cols-[220px_1fr] print:block">
        <aside className="no-print space-y-5">
          <nav className="rounded-xl border border-line bg-white p-2">
            {TABS.map(([t, label]) => (
              <button key={t} onClick={() => go(t)} className={cn("block w-full rounded-md px-3 py-1.5 text-left text-sm", t === tab ? "bg-brand-50 font-medium text-brand" : "text-slate-600 hover:bg-canvas")}>
                {label}
              </button>
            ))}
          </nav>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">B-D-C-D-T-A-M-E</div>
            <ul className="space-y-1.5 text-sm">
              {derived.stages.map((s) => (
                <li key={s.stage} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {s.state === "complete" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : s.state === "in_progress" ? <CircleDot className="h-3.5 w-3.5 text-brand-600" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                    {s.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{s.state === "complete" ? "✓" : s.percent ? `${s.percent}%` : "Pending"}</span>
                </li>
              ))}
            </ul>
          </div>
          {tab !== next.tab && (
            <button onClick={() => go(next.tab)} className="w-full rounded-xl border border-brand-600/30 bg-brand-50 p-4 text-left text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Next step</div>
              <div className="mt-1 flex items-center gap-1 font-medium text-brand">{next.label} <ArrowRight className="h-3.5 w-3.5" /></div>
              <div className="mt-0.5 text-xs text-muted">{next.detail}</div>
            </button>
          )}
        </aside>

        <section className="min-w-0">
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
    </div>
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
