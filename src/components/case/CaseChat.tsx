"use client";

import { Markdown } from "@/components/ui/Markdown";
import { useEffect, useRef, useState } from "react";
import { Lock, RotateCcw, Send, X } from "lucide-react";
import type { ChatMessage } from "@/server/services/chat";
import { Owl, type MascotMood } from "@/components/mascot";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/cn";

const STARTERS = [
  "Summarise what's happening in two sentences",
  "Which recommendation should we start with, and why?",
  "What assumptions carry the most risk?",
  "What does the base-case economics look like?",
];

/** Pilot, the case assistant: answers only from this case's analysis. */
export function CaseChat({ caseId, available }: { caseId: string; available: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<MascotMood | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open || loaded || !available) return;
    apiFetch<{ messages: ChatMessage[] }>(`/api/cases/${caseId}/chat`)
      .then((r) => setMessages(r.messages))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [open, loaded, available, caseId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (q.length < 2 || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMood("sparkle");
    seq.current += 1;
    const optimistic: ChatMessage = { id: `local-${seq.current}`, role: "user", content: q, createdAt: "" };
    setMessages((m) => [...m, optimistic]);
    try {
      const r = await apiFetch<{ messages: ChatMessage[] }>(`/api/cases/${caseId}/chat`, { body: { message: q } });
      setMessages(r.messages);
      const last = r.messages.at(-1);
      setMood(last?.outOfScope ? "bashful" : "delighted");
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(q);
      setError((e as Error).message);
      setMood("dizzy");
    } finally {
      setBusy(false);
      setTimeout(() => setMood(null), 1800);
    }
  };

  const followUps = messages.at(-1)?.role === "assistant" ? messages.at(-1)?.followUps ?? [] : [];

  return (
    <div className="no-print">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn("group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-4 shadow-pop transition hover:-translate-y-0.5", available ? "border-brand-100" : "border-line opacity-80")}
          aria-label={available ? "Ask Pilot about this case" : "Case assistant (unlocks after the report)"}
        >
          <span className="pointer-events-none"><Owl size={available ? 44 : 32} /></span>
          <span className="text-left text-sm">
            <span className="block font-semibold">Ask Pilot</span>
            {available ? <span className="block text-xs text-muted">Questions about this case</span> : <span className="block text-[11px] text-muted">Unlocks after the report</span>}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(640px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] animate-slide-up flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-pop">
          <div className="flex items-center gap-3 border-b border-line bg-gradient-to-br from-brand-50 via-white to-violet-50 px-4 py-3">
            <Owl size={52} mood={busy ? "sparkle" : mood} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Pilot</div>
              <div className="text-xs text-muted">{busy ? "Reading the case…" : "Answers only from this case's analysis"}</div>
            </div>
            {available && messages.length > 0 && (
              <button
                title="Clear conversation"
                aria-label="Clear conversation"
                className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink"
                onClick={async () => {
                  if (!confirm("Clear this conversation?")) return;
                  await apiFetch(`/api/cases/${caseId}/chat`, { method: "DELETE" }).catch(() => {});
                  setMessages([]);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </div>

          {!available ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
              <Lock className="h-6 w-6" />
              <p>I unlock once the strategy report is generated. Until then I&apos;d be guessing, and I don&apos;t guess.</p>
              <p className="text-xs">Finish the case and generate the report from the Report tab.</p>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && loaded && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">Hi! I&apos;ve read this whole case: diagnosis, hypotheses, recommendations, plan, economics and report. Ask me anything about it.</p>
                    <div className="grid gap-2">
                      {STARTERS.map((s) => (
                        <button key={s} onClick={() => ask(s)} className="rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-brand-500 hover:bg-brand-50">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex animate-fade-in", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "rounded-br-sm bg-ink text-white" : m.outOfScope ? "rounded-bl-sm border border-amber-200 bg-amber-50 text-amber-950" : "rounded-bl-sm bg-canvas text-ink")}>
                      {m.role === "user" ? <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div> : <Markdown text={m.content} className="leading-relaxed" />}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.citations.map((c) => <span key={c} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">{c}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex">
                    <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-canvas px-3.5 py-3">
                      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-subtle" style={{ animationDelay: `${i * 120}ms` }} />)}
                    </div>
                  </div>
                )}
                {!busy && followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {followUps.map((f) => <button key={f} onClick={() => ask(f)} className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand hover:bg-brand-100">{f}</button>)}
                  </div>
                )}
              </div>
              {error && <div className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              <form
                className="flex items-end gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input);
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask(input);
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Ask about this case…"
                  className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                />
                <button type="submit" aria-label="Send" disabled={busy || input.trim().length < 2} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
