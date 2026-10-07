"use client";

import { useState } from "react";
import { Bot, CheckCircle2, HelpCircle, Sparkles, User } from "lucide-react";
import type { FieldValue, ScoredQuestion } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, Chip, Input, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "./Workspace";

export function Interview({ view, ctl, canContribute, canManage, go }: CaseTabProps) {
  const { case: c } = view;
  const iv = ctl.interview;
  const recent = c.transcript.slice(-14);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="AI Consultant" description="Questions are ranked by information value: business impact × diagnostic value × uncertainty × decision relevance." />
          <CardBody className="space-y-3">
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
          </CardBody>
        </Card>

        {!iv ? (
          <Spinner label="Preparing questions…" />
        ) : iv.questions.length === 0 ? (
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
          iv.questions.map((q) => <QuestionCard key={q.id} q={q} disabled={!canContribute} busy={ctl.busy === `Saving ${q.id}`} onSubmit={(value, unknown, note) => ctl.run(`Saving ${q.id}`, "/answer", { body: { answers: [{ questionId: q.id, ...(unknown ? { unknown: true } : { value }), ...(note ? { note } : {}) }] } })} />)
        )}
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

function QuestionCard({ q, disabled, busy, onSubmit }: { q: ScoredQuestion; disabled: boolean; busy: boolean; onSubmit: (v: FieldValue | undefined, unknown: boolean, note?: string) => Promise<boolean> }) {
  const [value, setValue] = useState<string>("");
  const [multi, setMulti] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const current: FieldValue | undefined =
    q.input === "multiselect" ? (multi.length ? multi : undefined)
    : ["number", "percent", "currency"].includes(q.input) ? (value.trim() === "" ? undefined : Number(value))
    : q.input === "boolean" ? (value === "" ? undefined : value === "true")
    : value.trim() || undefined;

  return (
    <Card className="border-brand-600/20">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium leading-snug">{q.prompt}</p>
          <div className="flex shrink-0 gap-1">
            <Badge>{q.category}</Badge>
            {q.origin === "ai" && <Badge tone="violet">AI follow-up</Badge>}
            {q.critical && <Badge tone="amber">Critical</Badge>}
          </div>
        </div>

        <button type="button" onClick={() => setShowWhy(!showWhy)} className="flex items-center gap-1 text-xs font-medium text-brand-600">
          <HelpCircle className="h-3.5 w-3.5" /> Why am I asking this?
        </button>
        {showWhy && <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-muted">{q.why} <span className="text-xs">(information value {q.priority})</span></p>}

        {q.input === "select" && q.options && (
          <div className="flex flex-wrap gap-2">{q.options.map((o) => <Chip key={o} active={value === o} disabled={disabled} onClick={() => setValue(o)}>{o}</Chip>)}</div>
        )}
        {q.input === "multiselect" && q.options && !q.groups && (
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => <Chip key={o} active={multi.includes(o)} disabled={disabled} onClick={() => setMulti(multi.includes(o) ? multi.filter((x) => x !== o) : [...multi, o])}>{o}</Chip>)}
          </div>
        )}
        {q.input === "multiselect" && q.groups && (
          <GroupedChips groups={q.groups} selected={multi} disabled={disabled} onToggle={(o) => setMulti(multi.includes(o) ? multi.filter((x) => x !== o) : [...multi, o])} />
        )}
        {q.input === "boolean" && (
          <Select value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled}>
            <option value="">Select…</option><option value="true">Yes</option><option value="false">No</option>
          </Select>
        )}
        {["number", "percent", "currency"].includes(q.input) && (
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={q.input === "percent" ? 100 : undefined} step="any" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} className="max-w-xs" />
            <span className="text-sm text-muted">{q.input === "percent" ? "%" : q.input === "currency" ? "in case currency" : q.unit}</span>
          </div>
        )}
        {q.input === "text" && <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={q.placeholder} disabled={disabled} />}
        {q.input === "longtext" && <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder={q.placeholder} disabled={disabled} />}

        {showNote ? (
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for this answer" disabled={disabled} />
        ) : (
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setShowNote(true)}>+ Add a note</button>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={disabled || busy} onClick={() => onSubmit(undefined, true)}>I don&apos;t know / not available</Button>
          <Button size="sm" loading={busy} disabled={disabled || current === undefined} onClick={async () => {
            if (await onSubmit(current, false, note || undefined)) {
              setValue(""); setMulti([]); setNote(""); setShowNote(false);
            }
          }}>Save answer</Button>
        </div>
      </CardBody>
    </Card>
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
