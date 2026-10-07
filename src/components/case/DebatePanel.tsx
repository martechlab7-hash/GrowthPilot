"use client";

import { useState } from "react";
import { ChevronDown, Gavel, ShieldCheck, Swords } from "lucide-react";
import type { Hypothesis } from "@/domain/types";
import { Badge } from "@/components/ui";
import { Owl } from "@/components/mascot";
import { CHALLENGERS, JUDGE, getPanelist } from "@/knowledge/debatePanel";
import { cn } from "@/lib/cn";

const OUTCOME = {
  survives: { label: "Survives the challenge", tone: "green" as const, box: "border-emerald-200 bg-emerald-50", mood: "delighted" as const },
  weakened: { label: "Weakened", tone: "amber" as const, box: "border-amber-200 bg-amber-50", mood: "surprised" as const },
  refuted: { label: "Refuted", tone: "red" as const, box: "border-red-200 bg-red-50", mood: "dizzy" as const },
};

/** Row of the panel's mascots; used as the "debating…" state and in the section header. */
export function PanelLineup({ busy, size = 40 }: { busy?: boolean; size?: number }) {
  return (
    <div className="flex items-end -space-x-2" aria-label="Debate panel">
      {CHALLENGERS.map((p, i) => (
        <span key={p.id} title={`${p.name} · ${p.role}`} className={cn("rounded-full bg-white ring-2 ring-white", busy && "animate-bounce")} style={busy ? { animationDelay: `${i * 120}ms`, animationDuration: "1.4s" } : undefined}>
          <Owl character={p.character} size={size} label={p.name} />
        </span>
      ))}
    </div>
  );
}

/** Rule-based confidence breakdown plus the devil's-advocate debate for one hypothesis. */
export function DebatePanel({ h, debating }: { h: Hypothesis; debating: boolean }) {
  const [open, setOpen] = useState(true);
  const a = h.assessment;
  const d = h.debate;
  const outcome = d ? OUTCOME[d.verdict.outcome] : null;

  return (
    <div className="rounded-xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left">
        <Swords className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-semibold">Stress test</span>
        {a && (
          <span className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge tone={a.score >= 0.65 ? "green" : a.score >= 0.45 ? "amber" : "red"}>Evidence-checked confidence {Math.round(a.score * 100)}%</Badge>
            <span className="text-muted">{a.verifiedFacts} verified fact{a.verifiedFacts === 1 ? "" : "s"}{a.downgraded ? ` · ${a.downgraded} downgraded` : ""}{a.dataBacked ? " · data-backed" : ""}</span>
          </span>
        )}
        {outcome && <Badge tone={outcome.tone}>{outcome.label}</Badge>}
        {!d && debating && <span className="text-xs text-brand-600">The panel is debating…</span>}
        <ChevronDown className={cn("ml-auto h-4 w-4 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-3 py-4">
          {a && (
            <ul className="grid gap-1 text-xs text-muted sm:grid-cols-2">
              {a.basis.map((b) => <li key={b} className="flex gap-1.5"><ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />{b}</li>)}
            </ul>
          )}

          {!d ? (
            debating ? (
              <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted"><PanelLineup busy /><span>Seven devil&apos;s advocates are looking for holes in this hypothesis…</span></div>
            ) : (
              <p className="text-sm text-muted">Not debated yet. Use “Run the debate” above to stress-test it.</p>
            )
          ) : (
            <div className="space-y-3">
              {d.challenges.map((ch, i) => {
                const p = getPanelist(ch.panelistId);
                return (
                  <div key={i} className="flex animate-fade-in items-start gap-3" style={{ animationDelay: `${i * 120}ms` }}>
                    <div className="shrink-0 text-center"><Owl character={p?.character ?? "pirate"} size={52} mood={null} label={p?.name ?? "Challenger"} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{p?.name ?? "Challenger"} <span className="font-normal text-muted">· {p?.role}</span></div>
                      <div className="mt-1 rounded-2xl rounded-tl-sm border border-red-100 bg-red-50/60 px-3 py-2 text-sm text-ink">
                        {ch.argument}
                        {ch.alternative && <div className="mt-1.5 text-xs"><span className="font-semibold text-red-700">Alternative explanation:</span> {ch.alternative}</div>}
                        {ch.wouldChangeMind && <div className="mt-1 text-xs text-muted"><span className="font-semibold">Would change my mind:</span> {ch.wouldChangeMind}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex animate-fade-in flex-row-reverse items-start gap-3">
                <div className="shrink-0"><Owl size={52} mood="wink" /></div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-xs font-semibold">Pilot <span className="font-normal text-muted">· defends with evidence</span></div>
                  <div className="mt-1 inline-block rounded-2xl rounded-tr-sm border border-brand-100 bg-brand-50 px-3 py-2 text-left text-sm text-ink">
                    {d.defense.argument}
                    {d.defense.evidence.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">{d.defense.evidence.map((e) => <span key={e} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-brand-700 ring-1 ring-brand-100">{e}</span>)}</div>
                    )}
                  </div>
                </div>
              </div>

              {outcome && (
                <div className={cn("flex items-start gap-3 rounded-xl border p-3", outcome.box)}>
                  <div className="shrink-0"><Owl character={JUDGE.character} size={56} mood={outcome.mood} label={JUDGE.name} /></div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Gavel className="h-4 w-4" />
                      <span className="font-semibold">{JUDGE.name}: {outcome.label}</span>
                      <span className="text-xs text-muted">confidence {Math.round(d.verdict.confidence * 100)}%</span>
                    </div>
                    <p className="mt-1">{d.verdict.reasoning}</p>
                    {d.verdict.settleWith.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">What would settle it</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">{d.verdict.settleWith.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    )}
                    {d.model && <p className="mt-2 text-[11px] text-subtle">Challengers ran on {d.model}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
