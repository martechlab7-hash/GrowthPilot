"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bot, CheckCircle2, ChevronDown, CornerDownLeft, Database, Eye, HelpCircle, Loader2, PenLine, Sparkles, Target, Upload, User } from "lucide-react";
import type { CommsScreenshot, FieldValue, ScoredQuestion } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, Chip, Input, Spinner, Textarea } from "@/components/ui";
import { Owl } from "@/components/mascot";
import { useAuth } from "@/lib/client/auth";
import { cn } from "@/lib/cn";
import { coachLine } from "@/lib/interviewCoach";
import { firstName } from "@/lib/name";
import type { CaseTabProps } from "./Workspace";
import { PiiNotice } from "./DataShare";
import { CadenceInput, LinksInput, RichInputHint, ScreenshotsInput } from "./RichInputs";

type Submit = (v: FieldValue | undefined, unknown: boolean, note?: string, other?: string) => Promise<boolean>;

export function Interview({ view, ctl, canContribute, canManage, go }: CaseTabProps) {
  const { case: c } = view;
  const iv = ctl.interview;
  const { me } = useAuth();
  const name = me?.onboarded ? firstName(me.profile.displayName) : "";
  const [last, setLast] = useState<"answered" | "skipped" | null>(null);
  const current = iv?.questions[0];
  const upNext = iv?.questions.slice(1) ?? [];
  const progress = iv?.progress ?? { answered: c.askedQuestionIds.length, toReady: iv?.questions.length ?? 0, optional: iv?.questions.length ?? 0, total: c.askedQuestionIds.length + (iv?.questions.length ?? 0) };
  const ready = !!iv?.readiness.ready;
  const pct = ready ? 100 : progress.total ? Math.round((progress.answered / progress.total) * 100) : 0;
  const coach = iv
    ? coachLine({ name: name === "there" ? "" : name, answered: progress.answered, remaining: ready ? progress.optional : progress.toReady, ready, critical: !!current?.critical, category: current?.category, last })
    : null;

  // While the Interview Planner tailors questions, or pages and screenshots are being reviewed, refresh quietly.
  const shotIds = c.context.fields["marketing.comm_screenshots"]?.value;
  const sharedShots = (c.comms?.screenshots ?? []).filter((s) => Array.isArray(shotIds) && shotIds.includes(s.id));
  const pages = c.comms?.pages ?? [];
  const reviewing = [...pages, ...sharedShots].some((x) => x.status === "pending");
  const tailoring = iv?.tailoring === "pending" || reviewing;
  const polls = useRef(0);
  const reload = ctl.reload;
  useEffect(() => {
    if (!tailoring) return;
    const t = setInterval(() => {
      if (++polls.current > 40) return clearInterval(t);
      void reload();
    }, 3000);
    return () => clearInterval(t);
  }, [tailoring, reload]);

  const submit: Submit = async (value, unknown, note, other) => {
    const ok = await ctl.run(`Saving ${current!.id}`, "/answer", {
      body: { answers: [{ questionId: current!.id, ...(unknown ? { unknown: true } : value !== undefined ? { value } : {}), ...(other ? { other } : {}), ...(note ? { note } : {}) }] },
    });
    if (ok) setLast(unknown ? "skipped" : "answered");
    return ok;
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {coach && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 bg-gradient-to-r from-brand-50 via-white to-violet-50 px-5 py-4">
              <Owl size={64} mood={coach.mood} />
              <div key={coach.headline} className="min-w-0 flex-1 animate-fade-in">
                <p className="font-semibold tracking-tight">{coach.headline}</p>
                <p className="text-sm text-muted">{coach.detail}</p>
                {tailoring ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Tailoring the questions to your case…</p>
                ) : iv?.focus && progress.answered < 3 ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-brand-700"><Target className="mt-px h-3.5 w-3.5 shrink-0" /> {iv.focus}</p>
                ) : null}
              </div>
            </div>
            {(progress.total > 0 || ready) && (
              <div className="border-t border-line px-5 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">
                    {ready
                      ? progress.optional > 0
                        ? <>Core questions done <span className="text-muted">· {progress.optional} optional {progress.optional === 1 ? "question" : "questions"} to sharpen the diagnosis</span></>
                        : "All questions answered"
                      : <>Question {progress.answered + 1} <span className="text-muted">of about {progress.total}</span></>}
                  </span>
                  <span className={cn("tabular-nums", ready ? "font-medium text-emerald-600" : "text-muted")}>{ready ? "Ready to diagnose" : `${pct}% complete`}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Interview progress">
                  <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", ready ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-brand-500 to-violet-500")} style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
              </div>
            )}
          </Card>
        )}

        {!iv ? (
          <Spinner label="Preparing questions…" />
        ) : !current ? (
          <Card>
            <CardBody className="space-y-3 py-6 text-sm">
              <p className="font-medium">No further high-value questions in the standard interview.</p>
              <p className="text-muted">{iv.consultantNote}</p>
              <div className="flex flex-wrap gap-2">
                {canContribute && (
                  <Button variant="outline" loading={ctl.busy === "Thinking"} onClick={() => ctl.run("Thinking", "/interview", { body: { adaptive: true } })}>
                    <Sparkles className="h-4 w-4" /> Ask deeper follow-ups
                  </Button>
                )}
                {canManage && <Button onClick={() => go("diagnosis")}>Proceed to diagnosis</Button>}
              </div>
            </CardBody>
          </Card>
        ) : (
          <QuestionCard
            key={current.id}
            q={current}
            number={progress.answered + 1}
            disabled={!canContribute}
            busy={ctl.busy === `Saving ${current.id}`}
            onSubmit={submit}
            caseId={c.id}
            screenshots={c.comms?.screenshots ?? []}
            channels={Array.isArray(c.context.fields["marketing.channels"]?.value) ? (c.context.fields["marketing.channels"]!.value as string[]) : []}
          />
        )}

        {upNext.length > 0 && (
          <div className="rounded-2xl border border-dashed border-line-strong px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Up next</div>
            <ul className="mt-1.5 space-y-1 text-sm text-muted">
              {upNext.map((q, i) => (
                <li key={q.id} className="flex min-w-0 items-center gap-2">
                  <span className="tabular-nums text-subtle">{progress.answered + 2 + i}.</span>
                  <span className="min-w-0 truncate">{q.prompt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Conversation transcript={c.transcript} />
      </div>

      <div className="space-y-4">
        {iv && (
          <Card>
            <CardHeader title="Diagnostic readiness" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Critical questions</span><span className="tabular-nums">{iv.readiness.criticalAnswered}/{iv.readiness.criticalTotal}</span></div>
              <div className="flex justify-between"><span>Information coverage</span><span className="tabular-nums">{Math.round(iv.readiness.coverage * 100)}%</span></div>
              <p className="text-muted">{iv.consultantNote}</p>
              {canManage && (
                <Button className="w-full" variant={iv.readiness.ready ? "primary" : "outline"} onClick={() => go("diagnosis")}>
                  {iv.readiness.ready ? "Proceed to diagnosis" : "Diagnosis (incomplete discovery)"}
                </Button>
              )}
              {canContribute && iv.questions.length > 0 && (
                <Button className="w-full" variant="ghost" loading={ctl.busy === "Thinking"} onClick={() => ctl.run("Thinking", "/interview", { body: { adaptive: true } })}>
                  <Sparkles className="h-4 w-4" /> AI follow-up questions
                </Button>
              )}
            </CardBody>
          </Card>
        )}
        {(pages.length > 0 || sharedShots.length > 0) && (
          <Card>
            <CardBody className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 font-semibold"><Eye className="h-4 w-4 text-brand-600" /> What I&apos;m reviewing</div>
              {pages.map((p) => <ReviewLine key={p.url} label={p.title || p.url.replace(/^https?:\/\/(www\.)?/, "")} status={p.status} />)}
              {sharedShots.length > 0 && (
                <ReviewLine label={`${sharedShots.length} message screenshot${sharedShots.length === 1 ? "" : "s"}`} status={sharedShots.some((s) => s.status === "pending") ? "pending" : sharedShots.some((s) => s.status === "reviewed") ? "reviewed" : "failed"} />
              )}
              <Button className="w-full" variant="outline" size="sm" onClick={() => go("data")}>See Pilot&apos;s review</Button>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-brand-600" /> Have data? Share it</div>
            <p className="text-muted">An export (CSV) or pasted numbers often answers several questions at once, such as {iv?.progress && c.questionPlan?.metric ? <>{c.questionPlan.metric} by month and segment</> : "monthly results by segment or channel"}.</p>
            <PiiNotice compact />
            <Button className="w-full" variant="outline" onClick={() => go("data")}>
              <Upload className="h-4 w-4" /> Share data{c.datasets?.length ? ` (${c.datasets.length} shared)` : ""}
            </Button>
          </CardBody>
        </Card>
        {view.derived.coverage.length > 0 && (
          <Card>
            <CardHeader title="Coverage by area" />
            <CardBody className="space-y-2 text-sm">
              {view.derived.coverage.filter((s) => s.relevant > 0).map((s) => (
                <div key={s.stage} className="flex items-center justify-between gap-2">
                  <span>{s.label}</span>
                  {s.sufficient ? <Badge tone="green">Enough info</Badge> : <span className="tabular-nums text-muted">{s.known}/{s.relevant}</span>}
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Conversation({ transcript }: { transcript: CaseTabProps["view"]["case"]["transcript"] }) {
  const recent = transcript.slice(-20);
  if (!recent.length) return null;
  return (
    <details className="group rounded-2xl border border-line bg-white shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-medium">
        Our conversation so far <span className="flex items-center gap-1 text-xs font-normal text-muted">{transcript.length} messages <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></span>
      </summary>
      <div className="max-h-96 space-y-3 overflow-y-auto border-t border-line px-5 py-4">
        {recent.map((t) => (
          <div key={t.id} className={cn("flex gap-2.5 text-sm", t.role === "user" && "flex-row-reverse")}>
            <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", t.role === "user" ? "bg-slate-100" : "bg-brand-50")}>
              {t.role === "user" ? <User className="h-3.5 w-3.5 text-slate-600" /> : <Bot className="h-3.5 w-3.5 text-brand-600" />}
            </div>
            <div className={cn("max-w-[80%] rounded-xl px-3 py-2", t.role === "user" ? "bg-slate-100" : t.kind === "sufficiency" ? "bg-emerald-50 text-emerald-900" : "bg-brand-50/60")}>
              {t.kind === "sufficiency" && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
              {t.text}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

const RICH = ["links", "images", "cadence"];

const REVIEW_STATUS: Record<string, [string, string]> = {
  pending: ["Reading…", "text-brand-600"],
  read: ["Read", "text-emerald-600"],
  reviewed: ["Reviewed", "text-emerald-600"],
  failed: ["Couldn't read", "text-amber-600"],
  blocked: ["Not public", "text-amber-600"],
};

function ReviewLine({ label, status }: { label: string; status: string }) {
  const [text, tone] = REVIEW_STATUS[status] ?? [status, "text-muted"];
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate text-muted">{label}</span>
      <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", tone)}>
        {status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}{text}
      </span>
    </div>
  );
}

function QuestionCard({ q, number, disabled, busy, onSubmit, caseId, screenshots, channels }: { q: ScoredQuestion; number: number; disabled: boolean; busy: boolean; onSubmit: Submit; caseId: string; screenshots: CommsScreenshot[]; channels: string[] }) {
  // Inferred answers arrive pre-selected so the user only has to confirm them.
  const [value, setValue] = useState<string>(() => (typeof q.suggested === "string" ? q.suggested : ""));
  const [multi, setMulti] = useState<string[]>(() =>
    Array.isArray(q.suggested) ? q.suggested.map(String)
    // Screenshots uploaded earlier (e.g. before leaving the page) are kept.
    : q.input === "images" ? screenshots.map((s) => s.id)
    : [],
  );
  const rich = RICH.includes(q.input);
  const filled = rich ? multi.map((s) => s.trim()).filter(Boolean) : [];
  const [note, setNote] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const otherRef = useRef<HTMLTextAreaElement>(null);
  const choice = q.input === "select" || q.input === "multiselect";
  const otherText = otherOpen ? other.trim() : "";
  const options = useMemo(() => q.options ?? [], [q.options]);

  const current: FieldValue | undefined =
    rich ? (filled.length ? filled : undefined)
    : q.input === "multiselect" ? (multi.length ? multi : undefined)
    : ["number", "percent", "currency"].includes(q.input) ? (value.trim() === "" ? undefined : Number(value))
    : q.input === "boolean" ? (value === "" ? undefined : value === "true")
    : q.input === "select" && otherText ? undefined
    : value.trim() || undefined;
  const canSave = !disabled && !busy && (current !== undefined || !!otherText);

  const toggleMulti = (o: string) => setMulti(multi.includes(o) ? multi.filter((x) => x !== o) : [...multi, o]);
  const pickSelect = (o: string) => { setValue(o); setOtherOpen(false); };
  const openOther = () => {
    const next = !otherOpen;
    setOtherOpen(next);
    if (next && q.input === "select") setValue("");
    if (next) setTimeout(() => otherRef.current?.focus(), 0);
  };
  const save = async () => {
    if (!canSave) return;
    await onSubmit(q.input === "select" && otherText ? undefined : current, false, note || undefined, otherText || undefined);
  };

  // Keyboard: number keys pick options (outside text fields), Enter saves.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      if (e.key === "Enter" && (!typing || e.metaKey || e.ctrlKey || el.tagName === "INPUT")) {
        if (el.tagName === "BUTTON") return;
        // Rich inputs (links, calendar rows) use Enter themselves; Ctrl/Cmd+Enter still saves.
        if (el.closest("[data-rich-input]") && !e.metaKey && !e.ctrlKey) return;
        e.preventDefault();
        void saveRef.current();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || !choice || q.groups) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const o = options[n - 1];
      if (!o) return;
      if (q.input === "select") { setValue(o); setOtherOpen(false); } else setMulti((m) => (m.includes(o) ? m.filter((x) => x !== o) : [...m, o]));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [choice, options, q.groups, q.input]);

  return (
    <Card className="animate-slide-up border-brand-600/20 shadow-pop">
      <CardBody className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 px-2 text-sm font-semibold tabular-nums text-white shadow-md shadow-brand-600/25">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{q.prompt}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge>{q.category}</Badge>
              {q.origin === "ai" && <Badge tone="violet">AI follow-up</Badge>}
              {q.critical && <Badge tone="amber">Important</Badge>}
              {q.input === "multiselect" && <span className="text-xs text-muted">Pick all that apply</span>}
              <RichInputHint input={q.input} />
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setShowWhy(!showWhy)} className="flex items-center gap-1 text-xs font-medium text-brand-600">
          <HelpCircle className="h-3.5 w-3.5" /> Why am I asking this?
        </button>
        {showWhy && <p className="animate-fade-in rounded-lg bg-canvas px-3 py-2 text-sm text-muted">{q.why} <span className="text-xs">(information value {q.priority})</span></p>}

        {q.input === "select" && (
          <div className="flex flex-wrap gap-2">
            {options.map((o, i) => <OptionChip key={o} index={i} active={value === o && !otherOpen} disabled={disabled} onClick={() => pickSelect(o)}>{o}</OptionChip>)}
            <OtherChip active={otherOpen} disabled={disabled} onClick={openOther} />
          </div>
        )}
        {q.input === "multiselect" && !q.groups && (
          <div className="flex flex-wrap gap-2">
            {options.map((o, i) => <OptionChip key={o} index={i} active={multi.includes(o)} disabled={disabled} onClick={() => toggleMulti(o)}>{o}</OptionChip>)}
            <OtherChip active={otherOpen} disabled={disabled} onClick={openOther} />
          </div>
        )}
        {q.input === "multiselect" && q.groups && (
          <>
            <GroupedChips groups={q.groups} selected={multi} disabled={disabled} onToggle={toggleMulti} />
            <div><OtherChip active={otherOpen} disabled={disabled} onClick={openOther} label="Something else" /></div>
          </>
        )}
        {choice && otherOpen && (
          <div className="animate-fade-in">
            <Textarea
              ref={otherRef}
              rows={3}
              maxLength={2000}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tell me in your own words. The more detail, the better my diagnosis."
              disabled={disabled}
              aria-label="Your own answer"
            />
            <p className="mt-1 text-xs text-subtle">{q.input === "multiselect" ? "Added alongside anything you picked above." : "This replaces the options above."}</p>
          </div>
        )}
        {q.input === "boolean" && (
          <div className="flex gap-2">
            {[["true", "Yes"], ["false", "No"]].map(([v, l], i) => <OptionChip key={v} index={i} active={value === v} disabled={disabled} onClick={() => setValue(v!)}>{l}</OptionChip>)}
          </div>
        )}
        {["number", "percent", "currency"].includes(q.input) && (
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={q.input === "percent" ? 100 : undefined} step="any" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} className="max-w-xs" autoFocus />
            <span className="text-sm text-muted">{q.input === "percent" ? "%" : q.input === "currency" ? "in case currency" : q.unit}</span>
          </div>
        )}
        {q.input === "text" && <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={q.placeholder} disabled={disabled} autoFocus />}
        {q.input === "links" && <LinksInput value={multi} onChange={setMulti} disabled={disabled} placeholder={q.placeholder} />}
        {q.input === "images" && <ScreenshotsInput caseId={caseId} value={multi} onChange={setMulti} disabled={disabled} known={screenshots} channels={channels} />}
        {q.input === "cadence" && <CadenceInput value={multi} onChange={setMulti} disabled={disabled} channels={channels} />}
        {q.input === "longtext" && <Textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} placeholder={q.placeholder} disabled={disabled} autoFocus />}

        {showNote ? (
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for this answer" disabled={disabled} />
        ) : (
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setShowNote(true)}>+ Add a note</button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <span className="hidden items-center gap-1 text-xs text-subtle sm:flex">
            {choice && !q.groups && <><kbd className="rounded border border-line bg-canvas px-1 font-mono">1</kbd>–<kbd className="rounded border border-line bg-canvas px-1 font-mono">9</kbd> to pick ·</>}
            <kbd className="rounded border border-line bg-canvas px-1 font-mono"><CornerDownLeft className="inline h-3 w-3" /></kbd> to save
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" disabled={disabled || busy} onClick={() => onSubmit(undefined, true)}>I don&apos;t know / not available</Button>
            <Button size="sm" loading={busy} disabled={!canSave} onClick={() => void save()}>Save answer</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function OptionChip({ index, children, ...props }: { index: number; active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Chip {...props}>
      {index < 9 && <span className={cn("mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-semibold tabular-nums", props.active ? "bg-brand-600 text-white" : "bg-canvas text-subtle")}>{index + 1}</span>}
      {children}
    </Chip>
  );
}

function OtherChip({ active, disabled, onClick, label = "Other" }: { active: boolean; disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <Chip active={active} disabled={disabled} onClick={onClick}>
      <PenLine className="mr-1.5 inline h-3.5 w-3.5" />{label}…
    </Chip>
  );
}

function GroupedChips({ groups, selected, onToggle, disabled }: { groups: { label: string; options: string[] }[]; selected: string[]; onToggle: (o: string) => void; disabled: boolean }) {
  const [filter, setFilter] = useState("");
  const f = filter.trim().toLowerCase();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search tools — e.g. Adobe, Salesforce, Braze" className="max-w-sm" aria-label="Search tools" />
        {selected.length > 0 && <span className="text-xs text-muted">{selected.length} selected</span>}
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => {
          const opts = g.options.filter((o) => !f || o.toLowerCase().includes(f) || g.label.toLowerCase().includes(f));
          if (!opts.length) return null;
          return (
            <div key={g.label}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{g.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {opts.map((o) => <Chip key={o} active={selected.includes(o)} disabled={disabled} onClick={() => onToggle(o)}>{o}</Chip>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
