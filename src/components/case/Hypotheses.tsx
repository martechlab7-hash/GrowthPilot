"use client";

import { useState } from "react";
import { Check, CheckCircle2, CircleDashed, Lightbulb, Lock, Pencil, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { Hypothesis } from "@/domain/types";
import { Badge, Button, Card, CardBody, ConfidenceBadge, EmptyState, ErrorNote, Textarea } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { timeAgo } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { EvidenceList } from "./DiagnosisView";
import type { CaseTabProps } from "./Workspace";

const STATUS: Record<Hypothesis["status"], { label: string; tone: "neutral" | "green" | "amber" | "red"; you: string; border: string }> = {
  proposed: { label: "Awaiting your review", tone: "neutral", you: "", border: "border-l-slate-300" },
  agreed: { label: "Agreed", tone: "green", you: "You agreed", border: "border-l-emerald-500" },
  partially_agreed: { label: "Partially agreed", tone: "amber", you: "You partially agreed", border: "border-l-amber-500" },
  disagreed: { label: "Rejected", tone: "red", you: "You rejected this", border: "border-l-red-500" },
};

/** Hypothesis Approval Gate (spec §14–15). The AI stops here until the user decides. */
export function Hypotheses({ view, ctl, canManage, go }: CaseTabProps) {
  const { case: c } = view;
  const all = c.hypotheses;
  const reviewed = all.filter((h) => h.status !== "proposed").length;
  const pending = all.length - reviewed;
  const anyAgreed = all.some((h) => h.status === "agreed" || h.status === "partially_agreed");

  if (!c.diagnosis) {
    return <EmptyState icon={<Lightbulb className="h-8 w-8" />} title="Diagnosis needed first" description="Hypotheses are built from the diagnosis." action={<Button onClick={() => go("diagnosis")}>Go to diagnosis</Button>} />;
  }
  if (!all.length) {
    return (
      <EmptyState icon={<Lightbulb className="h-8 w-8" />} title="No hypotheses yet"
        action={canManage && <Button loading={ctl.busy === "Generating hypotheses"} onClick={() => ctl.run("Generating hypotheses", "/hypotheses")}>Generate hypotheses</Button>} />
    );
  }

  const rebuild = async () => {
    if (await ctl.run("Rebuilding diagnosis", "/diagnose", { body: { override: true } })) await ctl.run("Generating hypotheses", "/hypotheses");
  };
  const scrollTo = (id: string) => document.getElementById(`hyp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-50 via-white to-violet-50 px-5 py-4">
          <OwlSays size={64} mood={pending === 0 ? (anyAgreed ? "delighted" : "surprised") : null} tone={pending === 0 ? (anyAgreed ? "success" : "error") : "default"}>
            {pending > 0 ? (
              <><span className="font-semibold">Here is what I believe is happening.</span> Review each hypothesis. I won&apos;t build the strategy until you&apos;ve agreed, challenged or edited them.</>
            ) : anyAgreed ? (
              <><span className="font-semibold">All {all.length} reviewed. Thank you!</span> I&apos;ll build recommendations only from the ones you validated.</>
            ) : (
              <><span className="font-semibold">You rejected every hypothesis.</span> Rebuild the diagnosis and I&apos;ll use your feedback.</>
            )}
          </OwlSays>
        </div>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Reviewed {reviewed} of {all.length}</span>
            <span className="text-muted">{pending ? `${pending} remaining` : "Review complete"}</span>
          </div>
          <div className="flex gap-1" role="progressbar" aria-valuenow={reviewed} aria-valuemax={all.length} aria-label="Hypotheses reviewed">
            {all.map((h) => (
              <span key={h.id} className={cn("h-2 flex-1 rounded-full", h.status === "agreed" ? "bg-emerald-500" : h.status === "partially_agreed" ? "bg-amber-500" : h.status === "disagreed" ? "bg-red-500" : "bg-slate-200")} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {all.map((h, i) => (
              <button key={h.id} onClick={() => scrollTo(h.id)} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs hover:border-line-strong">
                {h.status === "proposed" ? <CircleDashed className="h-3 w-3 text-subtle" /> : h.status === "disagreed" ? <X className="h-3 w-3 text-red-600" /> : <Check className={cn("h-3 w-3", h.status === "agreed" ? "text-emerald-600" : "text-amber-600")} />}
                H{i + 1} · {STATUS[h.status].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {canManage && !pending && (!anyAgreed || c.analysisStale) && (
              <Button size="sm" variant="outline" loading={ctl.busy === "Rebuilding diagnosis" || ctl.busy === "Generating hypotheses"} onClick={rebuild}>Rebuild diagnosis</Button>
            )}
            {canManage && !pending && anyAgreed && (
              <Button size="sm" loading={ctl.busy === "Building recommendations"} onClick={async () => (await ctl.run("Building recommendations", "/recommendations")) && go("recommendations")}>
                {c.recommendations.length ? "Rebuild recommendations" : "Build recommendations"}
              </Button>
            )}
            {pending > 0 && <span className="flex items-center gap-1.5 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> Strategy unlocks after all hypotheses are reviewed</span>}
          </div>
        </CardBody>
      </Card>

      {all.map((h, i) => <HypothesisCard key={h.id} h={h} index={i + 1} ctl={ctl} canManage={canManage} />)}
    </div>
  );
}

function HypothesisCard({ h, index, ctl, canManage }: { h: Hypothesis; index: number; ctl: CaseTabProps["ctl"]; canManage: boolean }) {
  const [mode, setMode] = useState<null | "partially_agree" | "disagree" | "edit">(null);
  const [changing, setChanging] = useState(false);
  const [text, setText] = useState("");
  const [statement, setStatement] = useState(h.statement);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const label = `Reviewing ${h.id}`;
  const busy = ctl.busy === label;
  const s = STATUS[h.status];
  const reviewed = h.status !== "proposed";
  const showActions = canManage && (!reviewed || changing);

  const review = async (action: string, body: Record<string, unknown> = {}) => {
    setError(null);
    const ok = await ctl.run(label, `/hypotheses/${h.id}/review`, { body: { action, ...body } });
    if (ok) {
      setMode(null);
      setText("");
      setChanging(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } else {
      setError("Your review couldn't be saved. The reason is shown at the bottom of the screen — please try again.");
    }
  };

  return (
    <Card id={`hyp-${h.id}`} className={cn("scroll-mt-24 border-l-4 transition", s.border, reviewed && !changing && "bg-white/80")}>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Hypothesis {index}</div>
            <p className={cn("mt-1 text-base font-semibold leading-snug", h.status === "disagreed" && "text-muted line-through decoration-red-300")}>{h.statement}</p>
            <p className="mt-1 text-sm text-muted">Driver: {h.driver}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge tone={s.tone}>{s.label}</Badge>
            <ConfidenceBadge value={h.confidence} />
            <Badge tone={h.businessImpact === "high" ? "red" : "amber"}>{h.businessImpact} impact</Badge>
            {h.editedByUser && <Badge tone="blue">Edited by you</Badge>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Evidence</div><EvidenceList items={h.evidence} /></div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Missing evidence</div>
            {h.missingEvidence.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{h.missingEvidence.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="text-sm text-muted">None listed.</p>}
          </div>
        </div>

        {h.clarifyingQuestions.length > 0 && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div className="font-medium">To resolve this I&apos;d like to know (added to the interview):</div>
            <ul className="mt-1 list-disc pl-5">{h.clarifyingQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}

        {reviewed && !changing && (
          <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm", h.status === "agreed" ? "bg-emerald-50 text-emerald-900" : h.status === "disagreed" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900")}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span><span className="font-medium">{s.you}</span>{h.reviewedAt && <span className="opacity-70"> · {timeAgo(h.reviewedAt)}</span>}{h.userFeedback && <span> — “{h.userFeedback}”</span>}</span>
            </span>
            {savedFlash && <span className="animate-fade-in text-xs font-semibold">Saved ✓</span>}
            {canManage && <button className="text-xs font-medium underline-offset-2 hover:underline" onClick={() => setChanging(true)}>Change review</button>}
          </div>
        )}

        {showActions && (
          <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={busy && mode === null} disabled={busy} onClick={() => review("agree")}><ThumbsUp className="h-4 w-4" /> Agree</Button>
              <Button size="sm" variant={mode === "partially_agree" ? "secondary" : "outline"} disabled={busy} onClick={() => setMode(mode === "partially_agree" ? null : "partially_agree")}>Partially agree</Button>
              <Button size="sm" variant={mode === "disagree" ? "secondary" : "outline"} disabled={busy} onClick={() => setMode(mode === "disagree" ? null : "disagree")}><ThumbsDown className="h-4 w-4" /> Disagree</Button>
              <Button size="sm" variant={mode === "edit" ? "secondary" : "ghost"} disabled={busy} onClick={() => { setStatement(h.statement); setMode(mode === "edit" ? null : "edit"); }}><Pencil className="h-4 w-4" /> Edit</Button>
              {changing && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setChanging(false); setMode(null); }}>Cancel</Button>}
            </div>
            {mode && (
              <div className="animate-fade-in space-y-2">
                {mode === "edit" && <Textarea rows={2} value={statement} onChange={(e) => setStatement(e.target.value)} aria-label="Edited hypothesis" />}
                <Textarea
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Your feedback"
                  placeholder={mode === "disagree" ? "What part of this hypothesis do you disagree with? (required)" : mode === "partially_agree" ? "What would you change or add? (required)" : "Why did you edit it? (optional)"}
                />
                <div className="flex justify-end">
                  <Button size="sm" loading={busy} disabled={(mode !== "edit" && !text.trim()) || (mode === "edit" && statement.trim().length < 10)}
                    onClick={() => review(mode, { ...(text.trim() ? { feedback: text.trim() } : {}), ...(mode === "edit" ? { statement: statement.trim() } : {}) })}>
                    {mode === "disagree" ? "Submit disagreement" : mode === "partially_agree" ? "Submit feedback" : "Save edit"}
                  </Button>
                </div>
              </div>
            )}
            <ErrorNote error={error} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
