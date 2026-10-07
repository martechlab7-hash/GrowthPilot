"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BookOpen, Calculator, Info, Lightbulb, ListChecks, MapPin, Sparkles, Target, X } from "lucide-react";
import { getFramework } from "@/knowledge/frameworks";
import type { FrameworkGuide as Guide } from "@/knowledge/guides/types";
import { Badge, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { GuideChart } from "./GuideCharts";

/** Guides are large, so they are fetched only when someone opens one. */
let guidesPromise: Promise<Record<string, Guide>> | null = null;
const loadGuides = () => (guidesPromise ??= import("@/knowledge/guides").then((m) => m.FRAMEWORK_GUIDES));

/** The "i" button shown on every framework; opens the full guide. */
export function FrameworkInfoButton({ id, className }: { id: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const name = getFramework(id)?.name ?? "framework";
  return (
    <>
      <button
        type="button"
        aria-label={`About ${name}`}
        title="Open the framework guide"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onMouseEnter={() => void loadGuides()}
        className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-brand-600 ring-1 ring-brand-600/25 transition hover:bg-brand-50 hover:ring-brand-600/50", className)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && <FrameworkGuideDrawer id={id} onClose={() => setOpen(false)} />}
    </>
  );
}

const SECTIONS = [
  { id: "what", label: "What it is", icon: BookOpen },
  { id: "when", label: "Where it applies", icon: MapPin },
  { id: "how", label: "How it works", icon: ListChecks },
  { id: "simple", label: "In plain words", icon: Lightbulb },
  { id: "visuals", label: "Visual guide", icon: Sparkles },
  { id: "examples", label: "Examples", icon: Target },
  { id: "metrics", label: "Key metrics", icon: Calculator },
  { id: "pitfalls", label: "Pitfalls", icon: AlertTriangle },
] as const;

export function FrameworkGuideDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [current, setCurrent] = useState(id);
  const [guides, setGuides] = useState<Record<string, Guide> | null>(null);
  const [failed, setFailed] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fw = getFramework(current);
  const guide = guides?.[current];

  useEffect(() => {
    let live = true;
    loadGuides().then((g) => live && setGuides(g), () => live && setFailed(true));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const openRelated = (rid: string) => {
    setCurrent(rid);
    scroller.current?.scrollTo({ top: 0 });
  };
  const jump = (sid: string) => scroller.current?.querySelector(`#guide-${sid}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`${fw?.name ?? "Framework"} guide`}>
      <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl animate-slide-up flex-col bg-canvas shadow-pop">
        <header className="flex items-start gap-3 border-b border-line bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-semibold uppercase tracking-[0.12em] text-brand-600">Framework guide</span>
              {fw && <Badge>{fw.category}</Badge>}
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{fw?.name ?? current}</h2>
            {fw && <p className="mt-0.5 text-sm text-muted">{fw.description}</p>}
          </div>
          <button aria-label="Close guide" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"><X className="h-5 w-5" /></button>
        </header>
        {guide && (
          <nav aria-label="Guide sections" className="flex flex-wrap gap-1 border-b border-line bg-white px-5 py-2 sm:px-7">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)} className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:bg-brand-50 hover:text-brand-700">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </nav>
        )}

        <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {!guides && !failed && <Spinner label="Loading guide…" />}
          {failed && <p className="text-sm text-red-600">The guide could not be loaded. Check your connection and try again.</p>}
          {guides && !guide && fw && <BasicGuide id={current} />}
          {guide && fw && (
            <div className="space-y-8 text-[15px] leading-relaxed">
              <Section id="what" title="What it is" icon={BookOpen}>
                {guide.overview.map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
                <div className="mt-4 rounded-xl border border-brand-600/15 bg-brand-50/60 px-4 py-3 text-sm">
                  <span className="font-semibold text-brand-700">The question it answers: </span>{fw.answers}
                </div>
              </Section>

              <Section id="when" title="Where it applies" icon={MapPin}>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {guide.whenToUse.map((w) => <li key={w} className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm">{w}</li>)}
                </ul>
                <p className="mt-3 text-sm text-muted"><span className="font-medium text-ink">Data you need: </span>{fw.requiredData.join(" · ")}</p>
              </Section>

              <Section id="how" title="How it works" icon={ListChecks}>
                <ol className="space-y-3">
                  {guide.howItWorks.map((s, i) => (
                    <li key={s.step} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                      <div><div className="font-semibold">{s.step}</div><p className="text-sm text-muted">{s.detail}</p></div>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section id="simple" title="In plain words" icon={Lightbulb}>
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-4 text-amber-950 ring-1 ring-amber-200/70">{guide.plainWords}</div>
              </Section>

              <Section id="visuals" title="Visual guide" icon={Sparkles}>
                <div className="grid gap-4">{guide.visuals.map((v) => <GuideChart key={v.title} visual={v} />)}</div>
              </Section>

              <Section id="examples" title="Worked examples" icon={Target}>
                <div className="space-y-3">
                  {guide.examples.map((ex) => (
                    <div key={ex.title} className="rounded-2xl border border-line bg-white p-4">
                      <div className="font-semibold">{ex.title}</div>
                      <dl className="mt-2 grid gap-2 text-sm">
                        <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Situation</dt><dd>{ex.situation}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Analysis</dt><dd>{ex.analysis}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Outcome</dt><dd>{ex.outcome}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </Section>

              <Section id="metrics" title="Key metrics" icon={Calculator}>
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  {guide.keyMetrics.map((m) => (
                    <div key={m.name} className="border-b border-line px-4 py-3 text-sm last:border-0">
                      <div className="font-semibold">{m.name}</div>
                      {m.formula && <code className="mt-1 inline-block rounded-md bg-canvas px-2 py-0.5 font-mono text-[12.5px] text-brand-700">{m.formula}</code>}
                      <p className="mt-1 text-muted">{m.meaning}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section id="pitfalls" title="Common pitfalls" icon={AlertTriangle}>
                <ul className="space-y-2 text-sm">
                  {guide.pitfalls.map((p) => <li key={p} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{p}</li>)}
                </ul>
              </Section>

              <Related ids={guide.related} onOpen={openRelated} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: typeof Info; children: ReactNode }) {
  return (
    <section id={`guide-${id}`} className="scroll-mt-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight"><Icon className="h-4.5 w-4.5 text-brand-600" />{title}</h3>
      {children}
    </section>
  );
}

function Related({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  const items = ids.map((r) => getFramework(r)).filter((f): f is NonNullable<typeof f> => !!f);
  if (!items.length) return null;
  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-2 text-sm font-semibold">Related frameworks</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((f) => (
          <button key={f.id} onClick={() => onOpen(f.id)} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-brand-500 hover:text-brand-700">{f.name}</button>
        ))}
      </div>
    </section>
  );
}

/** Fallback when no long-form guide exists yet: show the library definition. */
function BasicGuide({ id }: { id: string }) {
  const fw = getFramework(id)!;
  return (
    <div className="space-y-4 text-sm">
      <p><span className="font-semibold">Answers: </span>{fw.answers}</p>
      <p><span className="font-semibold">Needs: </span>{fw.requiredData.join(", ")}</p>
      <ol className="list-decimal space-y-1 pl-5">{fw.steps.map((s) => <li key={s}>{s}</li>)}</ol>
    </div>
  );
}
