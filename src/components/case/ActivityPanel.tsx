"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Cpu, History, Lightbulb, Loader2, ScanSearch } from "lucide-react";
import type { CaseActivity } from "@/server/services/activity";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { Owl } from "@/components/mascot";

/**
 * Shows what the server is doing during an AI run: which agent, which
 * provider/model, retries, fallbacks, token usage and timing. Polls while busy.
 */
export function ActivityPanel({ caseId, busy }: { caseId: string; busy: string | null }) {
  const [activity, setActivity] = useState<CaseActivity | null>(null);
  // A manual open/close applies to the run it was made on; a new run opens automatically.
  const [toggled, setToggled] = useState<{ run: string; open: boolean } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiFetch<{ activity: CaseActivity | null }>(`/api/cases/${caseId}/activity`)
        .then((r) => !cancelled && setActivity(r.activity))
        .catch(() => {});
    void load();
    if (!busy) return () => void (cancelled = true);
    const poll = setInterval(load, 1200);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [caseId, busy]);

  // A run started in this view is "live" even before its first progress write lands.
  const live = !!busy && (!activity || activity.status === "running" || Date.parse(activity.startedAt) > now - 5_000);
  if (!activity && !busy) return null;
  const runKey = live ? `live:${busy}` : activity?.startedAt ?? "";
  const expanded = toggled?.run === runKey ? toggled.open : live;
  const failures = failureReasons(activity);
  const elapsed = activity ? Math.max(0, Math.round(((activity.finishedAt ? Date.parse(activity.finishedAt) : now) - Date.parse(activity.startedAt)) / 1000)) : 0;
  const status = live ? "running" : activity?.status;
  const lastStep = activity?.steps.at(-1);

  return (
    <div className={cn("mb-4 overflow-hidden rounded-2xl border bg-white shadow-card transition", status === "failed" ? "border-red-200" : status === "running" ? "border-brand-100 ring-4 ring-brand-500/10" : "border-line")}>
      <div className={cn("flex items-center gap-3 px-3 py-2", status === "running" && "bg-gradient-to-r from-brand-50 to-white")}>
        <Owl size={48} mood={status === "running" ? "sparkle" : status === "failed" ? "dizzy" : null} label="Pilot" />
        <button type="button" onClick={() => setToggled({ run: runKey, open: !expanded })} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-1 text-left text-sm" aria-expanded={expanded}>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-medium">
              {status === "running" ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-600" /> : status === "failed" ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              {status === "running" ? "Pilot is working" : status === "failed" ? "Last run failed" : "Last run completed"}
              <span className="font-normal text-muted">· {activity?.operation ?? busy}</span>
            </span>
            <span className="block truncate text-xs text-muted">
              {status === "running" && lastStep ? lastStep.label : activity?.model ? `${activity.provider} · ${activity.model}` : "Preparing…"}
              {activity && ` · ${elapsed}s`}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("h-4 w-4 shrink-0 text-muted transition", expanded && "rotate-180")} />
        </button>
      </div>
      {status === "failed" && failures.length > 0 && (
        <div className="flex flex-wrap items-start gap-3 border-t border-red-100 bg-red-50/60 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="font-medium text-red-900">Why it failed</div>
            <ul className="space-y-1 text-red-900/90">{failures.map((f) => <li key={f} className="[overflow-wrap:anywhere]">{f}</li>)}</ul>
          </div>
          <Link href="/settings/ai-providers" className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50">AI provider settings</Link>
        </div>
      )}
      {expanded && activity && (
        <div className="border-t border-line">
          <StepList steps={activity.steps} running={status === "running"} />
          {!!activity.history?.length && (
            <details className="group border-t border-line">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted hover:text-ink">
                <History className="h-3.5 w-3.5" /> Previous runs ({activity.history.length})
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-2 px-4 pb-3">
                {activity.history.map((run, i) => (
                  <details key={i} className="rounded-lg border border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs">
                      {run.status === "failed" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      <span className="font-medium">{run.operation}</span>
                      <span className="text-muted">· {new Date(run.startedAt).toLocaleString()}{run.model ? ` · ${run.model}` : ""}</span>
                    </summary>
                    <StepList steps={run.steps} running={false} />
                  </details>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {expanded && !activity && <p className="border-t border-line px-4 py-3 text-sm text-muted">Starting…</p>}
    </div>
  );
}

/** The distinct provider errors of a failed run, most recent first (without raw payload noise). */
function failureReasons(activity: CaseActivity | null): string[] {
  if (activity?.status !== "failed") return [];
  const seen = new Set<string>();
  for (const s of [...activity.steps].reverse()) {
    if (s.status !== "error" || !s.detail || s.label.startsWith("Stopped")) continue;
    const msg = s.detail.replace(/\s*\((?:[^()]|\([^()]*\))*\)\s*$/, "").trim();
    if (msg) seen.add(msg);
    if (seen.size >= 3) break;
  }
  return [...seen];
}

/** Steps grouped visually by kind: analysis (what is examined), AI calls, and the model's reasoning summary. */
function StepList({ steps, running }: { steps: CaseActivity["steps"]; running: boolean }) {
  return (
    <ol className="max-h-96 space-y-2 overflow-y-auto px-4 py-3 text-sm">
      {steps.map((s, i) =>
        s.kind === "thinking" ? (
          <li key={i} className="flex gap-2.5">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span className="min-w-0 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[13px] italic text-violet-950 [overflow-wrap:anywhere]">
              <span className="mr-1 text-[10px] font-semibold uppercase not-italic tracking-wider text-violet-500">Reasoning</span>{s.label}
            </span>
          </li>
        ) : (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0">
              {s.status === "running" && running ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                : s.status === "error" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                : s.kind === "analysis" ? <ScanSearch className="h-3.5 w-3.5 text-sky-600" />
                : s.kind === "ai" ? <Cpu className="h-3.5 w-3.5 text-slate-500" />
                : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            </span>
            <span className="min-w-0">
              <span className={cn("[overflow-wrap:anywhere]", s.status === "error" && "text-red-700", s.kind === "analysis" && "font-medium text-sky-900")}>{s.label}</span>
              <span className="ml-2 text-xs text-muted">{new Date(s.at).toLocaleTimeString()}</span>
              {s.detail && <span className="block text-xs text-muted [overflow-wrap:anywhere]">{s.detail}</span>}
            </span>
          </li>
        ),
      )}
    </ol>
  );
}
