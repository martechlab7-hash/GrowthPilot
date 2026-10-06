"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import type { CaseActivity } from "@/server/services/activity";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/cn";

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

  return (
    <div className={cn("mb-4 rounded-xl border bg-white", status === "failed" ? "border-red-200" : status === "running" ? "border-brand-600/30" : "border-line")}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm" aria-expanded={expanded}>
        <span className="flex min-w-0 items-center gap-2">
          {status === "running" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" /> : status === "failed" ? <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
          <span className="truncate">
            <span className="font-medium">{status === "running" ? "Working" : status === "failed" ? "Last run failed" : "Last run completed"}:</span>{" "}
            {activity?.operation ?? busy}
            {activity?.model && <span className="text-muted"> · {activity.provider} · {activity.model}</span>}
            {activity && <span className="text-muted"> · {elapsed}s</span>}
          </span>
        </span>
        {!live && <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />}
      </button>
      {expanded && activity && (
        <ol className="space-y-2 border-t border-line px-4 py-3 text-sm">
          {activity.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0">
                {s.status === "running" && status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> : s.status === "error" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              </span>
              <span className="min-w-0">
                <span className={cn(s.status === "error" && "text-red-700")}>{s.label}</span>
                <span className="ml-2 text-xs text-muted">{new Date(s.at).toLocaleTimeString()}</span>
                {s.detail && <span className="block break-words text-xs text-muted">{s.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {expanded && !activity && <p className="border-t border-line px-4 py-3 text-sm text-muted">Starting…</p>}
    </div>
  );
}
