import "server-only";
import type { Progress } from "@/ai/agents";
import type { AIEvent } from "@/ai/types";
import { log } from "../logger";
import { getStore } from "../store";

export interface ActivityStep {
  at: string;
  label: string;
  detail?: string;
  status: "running" | "done" | "error";
  /** analysis = what is being examined; thinking = the model's own summary; ai = provider calls. */
  kind?: "analysis" | "thinking" | "ai";
}

/** A finished run kept for the "previous runs" list. */
export interface ActivityRun {
  operation: string;
  status: "running" | "succeeded" | "failed";
  provider?: string;
  model?: string;
  startedAt: string;
  finishedAt?: string;
  steps: ActivityStep[];
}

const HISTORY = 6;

/** Live record of the AI operation running on a case (one document per case). */
export interface CaseActivity {
  id: string; // = caseId
  organizationId: string;
  caseId: string;
  operation: string;
  status: "running" | "succeeded" | "failed";
  provider?: string;
  model?: string;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  steps: ActivityStep[];
  /** Earlier runs on this case, newest first. */
  history?: ActivityRun[];
}

const OPERATION_LABELS: Record<string, string> = {
  diagnose: "Diagnosis",
  hypotheses: "Hypothesis generation",
  refine_hypothesis: "Hypothesis refinement",
  recommendations: "Recommendations",
  plan: "Activation & measurement plan",
  report: "Strategy report",
  interview: "Adaptive interview questions",
  plan_interview: "Tailoring the interview to your case",
  debate: "Debate panel stress-testing hypotheses",
  extract: "Reading facts from your answer",
  chat: "Answering your question",
  comms_review: "Reviewing your message screenshots",
  page_review: "Reading your linked pages",
};

const col = () => getStore().collection<CaseActivity>("case_activity");

/**
 * Writes progress as it happens so the UI can poll it while the request runs.
 * Writes are serialised and failures are swallowed: reporting never breaks analysis.
 */
export class ActivityRecorder implements Progress {
  private doc: CaseActivity;
  private queue: Promise<void> = Promise.resolve();

  constructor(orgId: string, caseId: string, operation: string) {
    const t = new Date().toISOString();
    this.doc = { id: caseId, organizationId: orgId, caseId, operation: OPERATION_LABELS[operation] ?? operation, status: "running", startedAt: t, updatedAt: t, steps: [] };
  }

  private loaded = false;

  private flush() {
    if (!this.loaded) {
      this.loaded = true;
      // Carry earlier runs forward so the panel can show them.
      this.queue = this.queue
        .then(async () => {
          const prev = await col().get(this.doc.id);
          if (prev && prev.organizationId === this.doc.organizationId) {
            const { history = [], id: _i, organizationId: _o, caseId: _c, updatedAt: _u, ...run } = prev;
            void _i; void _o; void _c; void _u;
            this.doc.history = [{ ...run, steps: run.steps.slice(-40) }, ...history].slice(0, HISTORY);
          }
        })
        .catch(() => {});
    }
    const queue = this.queue.then(() => {
      const snapshot = structuredClone(this.doc);
      return col().set(snapshot);
    });
    this.queue = queue.catch((err) => log("warn", "activity.write_failed", { message: (err as Error).message }));
    return this.queue;
  }

  step(label: string, detail?: string, status: ActivityStep["status"] = "running", kind?: ActivityStep["kind"]) {
    const t = new Date().toISOString();
    for (const s of this.doc.steps) if (s.status === "running") s.status = "done";
    this.doc.steps.push({ at: t, label: clip(label, 240), ...(detail ? { detail: clip(detail, 600) } : {}), status, ...(kind ? { kind } : {}) });
    this.doc.steps = this.doc.steps.slice(-60);
    this.doc.updatedAt = t;
    void this.flush();
  }

  analysis(label: string, detail?: string) {
    this.step(label, detail, "done", "analysis");
  }

  think(thought: string) {
    this.step(thought, undefined, "done", "thinking");
  }

  ai(e: AIEvent) {
    switch (e.type) {
      case "attempt":
        this.doc.provider = e.provider;
        this.doc.model = e.model;
        this.step(`Calling ${e.provider} · ${e.model}`, e.attempt > 1 ? `Attempt ${e.attempt}` : "Waiting for the model to respond (this can take 20–90 seconds)", "running", "ai");
        break;
      case "response":
        this.step(`Response received from ${e.model}`, `${(e.latencyMs / 1000).toFixed(1)}s · ${e.inputTokens.toLocaleString("en")} input / ${e.outputTokens.toLocaleString("en")} output tokens`, "done", "ai");
        break;
      case "repair":
        this.step("Output did not match the expected structure — asking the model to correct it", e.reason.slice(0, 200));
        break;
      case "error":
        this.step(`${e.provider} failed${e.willRetry ? " — retrying" : ""}`, e.message.slice(0, 500), "error");
        break;
      case "fallback":
        this.step(`Falling back from ${e.from} to ${e.to}`);
        break;
      case "skipped": {
        const why = { quota: "its quota or credits ran out", auth: "its API key was rejected", model: "the model was not found", timeout: "it timed out" }[e.reason] ?? e.reason;
        this.step(`Skipping ${e.provider} for now`, `${e.model} failed a moment ago because ${why}. Trying it again in about ${e.minutes} min.`, "done", "ai");
        break;
      }
    }
  }

  async finish(status: "succeeded" | "failed", detail?: string) {
    const t = new Date().toISOString();
    for (const s of this.doc.steps) if (s.status === "running") s.status = status === "failed" ? "error" : "done";
    this.doc.steps.push({ at: t, label: status === "succeeded" ? "Completed and saved to the case" : "Stopped — case saved, nothing lost", ...(detail ? { detail: clip(detail, 600) } : {}), status: status === "succeeded" ? "done" : "error" });
    this.doc.status = status;
    this.doc.finishedAt = t;
    this.doc.updatedAt = t;
    await this.flush();
  }
}

export async function getActivity(orgId: string, caseId: string): Promise<CaseActivity | null> {
  const a = await col().get(caseId);
  return a && a.organizationId === orgId ? a : null;
}

/** Provider errors can embed huge raw payloads; keep the log readable. */
function clip(s: string, max: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
