"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
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
  const [open, setOpen] = useState(false);
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
  const expanded = live || open;
  const elapsed = activity ? Math.max(0, Math.round(((activity.finishedAt ? Date.parse(activity.finishedAt) : now) - Date.parse(activity.startedAt)) / 1000)) : 0;
  const status = live ? "running" : activity?.status;
  const lastStep = activity?.steps.at(-1);

  return (
    <div className={cn("mb-4 overflow-hidden rounded-2xl border bg-white shadow-card transition", status === "failed" ? "border-red-200" : status === "running" ? "border-brand-100 ring-4 ring-brand-500/10" : "border-line")}>
      <div className={cn("flex items-center gap-3 px-3 py-2", status === "running" && "bg-gradient-to-r from-brand-50 to-white")}>
        <Owl size={48} mood={status === "running" ? "sparkle" : status === "failed" ? "dizzy" : null} label="Pilot" />
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-1 text-left text-sm" aria-expanded={expanded}>
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
          {!live && <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />}
        </button>
      </div>
      {expanded && activity && (
        <ol className="max-h-80 space-y-2 overflow-y-auto border-t border-line px-4 py-3 text-sm">
          {activity.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0">
                {s.status === "running" && status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> : s.status === "error" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              </span>
              <span className="min-w-0">
                <span className={cn("[overflow-wrap:anywhere]", s.status === "error" && "text-red-700")}>{s.label}</span>
                <span className="ml-2 text-xs text-muted">{new Date(s.at).toLocaleTimeString()}</span>
                {s.detail && <span className="block text-xs text-muted [overflow-wrap:anywhere]">{s.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {expanded && !activity && <p className="border-t border-line px-4 py-3 text-sm text-muted">Starting…</p>}
    </div>
  );
}
