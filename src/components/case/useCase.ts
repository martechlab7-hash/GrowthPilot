"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoredQuestion } from "@/domain/types";
import type { Readiness } from "@/engine/interview";
import type { withDerived } from "@/server/services/cases";
import { ApiError, apiFetch } from "@/lib/client/api";

export type CaseView = ReturnType<typeof withDerived>;
export interface InterviewView {
  questions: ScoredQuestion[];
  sufficiency: string[];
  readiness: Readiness;
  consultantNote: string;
}
type WithInterview = CaseView & { interview?: InterviewView };

export function useCase(id: string) {
  const [view, setView] = useState<CaseView | null>(null);
  const [interview, setInterview] = useState<InterviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const mounted = useRef(true);

  const accept = useCallback((res: WithInterview) => {
    setView({ case: res.case, derived: res.derived });
    if (res.interview) setInterview(res.interview);
    setSavedAt(new Date().toISOString());
  }, []);

  const load = useCallback(async () => {
    try {
      accept(await apiFetch<WithInterview>(`/api/cases/${id}/interview`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, accept]);

  useEffect(() => {
    mounted.current = true;
    apiFetch<WithInterview>(`/api/cases/${id}/interview`)
      .then((res) => mounted.current && accept(res))
      .catch((e: Error) => mounted.current && setError(e.message));
    return () => {
      mounted.current = false;
    };
  }, [id, accept]);

  /** Run a mutation; every mutation endpoint returns the full updated case. */
  const run = useCallback(
    async (label: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<boolean> => {
      setBusy(label);
      setError(null);
      try {
        const res = await apiFetch<WithInterview>(`/api/cases/${id}${path}`, { method: init.method ?? "POST", body: init.body ?? {} });
        if (mounted.current) accept(res);
        if (!res.interview && path !== "/interview") {
          // Keep the interview panel in sync with the new context.
          apiFetch<WithInterview>(`/api/cases/${id}/interview`).then((r) => mounted.current && r.interview && setInterview(r.interview)).catch(() => {});
        }
        return true;
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof ApiError && e.code === "AI_UNAVAILABLE" ? `${e.message}` : (e as Error).message);
          if (e instanceof ApiError && e.code === "AI_UNAVAILABLE") void load();
        }
        return false;
      } finally {
        if (mounted.current) setBusy(null);
      }
    },
    [id, accept, load],
  );

  return { view, interview, error, setError, busy, run, reload: load, savedAt };
}
