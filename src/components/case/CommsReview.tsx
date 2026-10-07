"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ExternalLink, Globe, Lightbulb, Loader2, MessageSquareText, RefreshCw, X, Zap } from "lucide-react";
import type { CommsScreenshot, CreativeReview, PageReview } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { analyzeCadence, DAYS } from "@/engine/cadence";
import { cn } from "@/lib/cn";
import { Thumb } from "./RichInputs";
import type { CaseTabProps } from "./Workspace";

/**
 * Pilot's review of what the user shared in the interview: linked pages (read
 * in code, then reviewed), communication screenshots (reviewed by a vision
 * model) and the contact calendar (analysed in code).
 */
export function CommsReview({ view, ctl, canContribute, go }: CaseTabProps) {
  const c = view.case;
  const shotIds = c.context.fields["marketing.comm_screenshots"]?.value;
  const shots = (c.comms?.screenshots ?? []).filter((s) => Array.isArray(shotIds) && shotIds.includes(s.id));
  const pages = c.comms?.pages ?? [];
  const cadence = c.context.fields["marketing.cadence"]?.value;
  const channels = c.context.fields["marketing.channels"]?.value;
  const analysis = useMemo(
    () => (Array.isArray(cadence) && cadence.length ? analyzeCadence(cadence, { problemTypes: c.problemTypes, channels: Array.isArray(channels) ? channels : [] }) : null),
    [cadence, channels, c.problemTypes],
  );
  if (!pages.length && !shots.length && !analysis) return null;

  return (
    <Card>
      <CardHeader
        title="Your communications, reviewed"
        description="What you shared in the interview: pages I read, messages I looked at and your contact calendar. The diagnosis and strategy use these findings."
        action={<Button size="sm" variant="ghost" onClick={() => go("interview")}>Add more</Button>}
      />
      <CardBody className="space-y-8">
        {analysis && <CadenceSection analysis={analysis} />}
        {shots.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={MessageSquareText} title="Message screenshots" action={canContribute && !shots.some((s) => s.status === "pending") ? (
              <Button size="sm" variant="outline" loading={ctl.busy === "Reviewing screenshots"} onClick={() => ctl.run("Reviewing screenshots", "/comms", { body: { target: "screenshots" } })}>
                <RefreshCw className="h-3.5 w-3.5" /> Review again
              </Button>
            ) : undefined} />
            {c.comms?.overall && <p className="rounded-xl bg-brand-50/60 px-4 py-3 text-sm text-ink">{c.comms.overall}</p>}
            <div className="space-y-4">
              {shots.map((s) => <ShotCard key={s.id} caseId={c.id} s={s} />)}
            </div>
          </section>
        )}
        {pages.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={Globe} title="Pages" action={canContribute && !pages.some((p) => p.status === "pending") ? (
              <Button size="sm" variant="outline" loading={ctl.busy === "Reading pages"} onClick={() => ctl.run("Reading pages", "/comms", { body: { target: "pages" } })}>
                <RefreshCw className="h-3.5 w-3.5" /> Read again
              </Button>
            ) : undefined} />
            <div className="space-y-4">
              {pages.map((p) => <PageCard key={p.url} p={p} />)}
            </div>
          </section>
        )}
      </CardBody>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof Globe; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-brand-600" /> {title}</h3>
      {action}
    </div>
  );
}

function CadenceSection({ analysis }: { analysis: ReturnType<typeof analyzeCadence> }) {
  const maxDay = Math.max(1, ...DAYS.map((d) => analysis.byDay[d]));
  const maxCh = Math.max(1, ...analysis.channels.map((c) => c.perWeek));
  return (
    <section className="space-y-3">
      <SectionTitle icon={CalendarClock} title="Contact calendar" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{analysis.perWeek}</span>
            <span className="text-xs text-muted">scheduled sends a week{analysis.triggered ? ` · ${analysis.triggered} triggered message${analysis.triggered === 1 ? "" : "s"}` : ""}</span>
          </div>
          <div className="space-y-1.5">
            {analysis.channels.map((ch) => (
              <div key={ch.channel} className="grid grid-cols-[6rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
                <span className="truncate text-muted">{ch.channel}</span>
                <div className="h-2.5 rounded-full bg-canvas">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-brand-600 to-violet-500" style={{ width: `${(ch.perWeek / maxCh) * 100}%`, minWidth: ch.perWeek ? 4 : 0 }} />
                </div>
                <span className="text-right tabular-nums">{ch.perWeek}/wk{ch.triggered ? <Zap className="ml-0.5 inline h-3 w-3 text-amber-500" aria-label="has triggered messages" /> : null}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 pt-1" aria-label="Scheduled sends per weekday">
            {DAYS.map((d) => (
              <div key={d} className="text-center">
                <div className="flex h-14 items-end rounded-md bg-canvas">
                  <div className="w-full rounded-md bg-gradient-to-t from-brand-600 to-violet-500" style={{ height: `${(analysis.byDay[d] / maxDay) * 100}%`, minHeight: analysis.byDay[d] ? 3 : 0 }} />
                </div>
                <div className="mt-0.5 text-[10px] text-subtle">{d}</div>
                <div className="text-[10px] tabular-nums text-muted">{analysis.byDay[d] || ""}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {analysis.findings.map((f, i) => (
            <div key={i} className={cn("flex gap-2 rounded-xl px-3 py-2 text-sm", i === 0 ? "bg-canvas text-ink" : "border border-amber-200 bg-amber-50/60 text-amber-950")}>
              {i === 0 ? <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="pb-2 font-medium">Channel</th><th className="pb-2 font-medium">Message</th><th className="pb-2 font-medium">How often</th><th className="pb-2 font-medium">When</th><th className="pb-2 font-medium">Type</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {analysis.rows.map((r, i) => (
              <tr key={i}>
                <td className="py-2 pr-3 font-medium">{r.channel}</td>
                <td className="py-2 pr-3 text-muted">{r.purpose || "—"}</td>
                <td className="py-2 pr-3">{r.frequency}</td>
                <td className="py-2 pr-3 text-muted">{[r.days.length === 7 ? "Every day" : r.days.join(", "), r.time].filter(Boolean).join(" · ") || "Varies"}</td>
                <td className="py-2"><Badge tone={r.mode === "Triggered" ? "amber" : "neutral"}>{r.mode}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShotCard({ caseId, s }: { caseId: string; s: CommsScreenshot }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4 rounded-xl border border-line p-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <button type="button" onClick={() => setOpen(true)} className="overflow-hidden rounded-lg border border-line" aria-label={`Enlarge ${s.name}`}>
        <Thumb caseId={caseId} id={s.id} alt={s.name} />
      </button>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{s.channel ?? s.review?.channel ?? "Message"}</Badge>
          <span className="min-w-0 truncate text-xs text-subtle">{s.name}</span>
          <Status status={s.status} />
        </div>
        {s.status === "failed" && <p className="text-sm text-amber-800">{s.error ?? "This screenshot could not be reviewed."}</p>}
        {s.review && <ReviewBody r={s.review} extra={s.review.personalisation ? [["Personalisation", s.review.personalisation]] : []} />}
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={s.name} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={() => setOpen(false)}>
          <div className="relative max-h-full max-w-2xl overflow-auto rounded-2xl bg-white p-2 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow" aria-label="Close"><X className="h-4 w-4" /></button>
            <Thumb caseId={caseId} id={s.id} alt={s.name} className="aspect-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function PageCard({ p }: { p: PageReview }) {
  const f = p.facts;
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium [overflow-wrap:anywhere]">{p.title || p.url}</div>
          <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-xs text-brand-600 [overflow-wrap:anywhere] hover:underline">
            {p.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <Status status={p.status} />
      </div>
      {(p.status === "failed" || p.status === "blocked") && <p className="text-sm text-amber-800">{p.error ?? "This page could not be read."}</p>}
      {f && (
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <Fact label="Headline">{f.headings[0]?.replace(/^H\d: /, "") ?? "No headline found"}</Fact>
          <Fact label="Calls to action">{f.ctas.length ? f.ctas.slice(0, 5).join(" · ") : "None found"}</Fact>
          <Fact label="Forms">{f.forms ? `${f.forms} form(s), ${f.formFields} field(s)` : "No form"}</Fact>
          <Fact label="Offers">{f.offers.length ? f.offers.slice(0, 2).join(" · ") : "None found"}</Fact>
          <Fact label="Trust signals">{f.trustSignals.length ? f.trustSignals.slice(0, 2).join(" · ") : "None found"}</Fact>
          <Fact label="Meta description">{f.description || "Missing"}</Fact>
        </div>
      )}
      {p.review && <ReviewBody r={p.review} />}
      {p.status === "read" && !p.review && <p className="text-xs text-subtle">Read from the page&apos;s HTML. Add an AI provider for a full review.</p>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">{label}</div>
      <div className="mt-0.5 text-ink [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

function ReviewBody({ r, extra = [] }: { r: Omit<CreativeReview, "channel" | "personalisation"> & Partial<Pick<CreativeReview, "channel" | "personalisation">>; extra?: [string, string][] }) {
  const meta: [string, string | undefined][] = [["Message", r.message], ["Call to action", r.cta], ["Offer", r.offer], ...extra];
  return (
    <div className="space-y-2 text-sm">
      <p>{r.summary}</p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {meta.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="inline text-subtle">{k}: </dt><dd className="inline text-ink">{v}</dd></div>)}
      </dl>
      <div className="grid gap-2 md:grid-cols-3">
        <List tone="green" icon={CheckCircle2} title="Working" items={r.strengths} />
        <List tone="amber" icon={AlertTriangle} title="Issues" items={r.issues} />
        <List tone="blue" icon={Lightbulb} title="Try" items={r.ideas} />
      </div>
    </div>
  );
}

function List({ tone, icon: Icon, title, items }: { tone: "green" | "amber" | "blue"; icon: typeof Globe; title: string; items: string[] }) {
  if (!items.length) return null;
  const tones = { green: "text-emerald-600", amber: "text-amber-600", blue: "text-brand-600" };
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className={cn("mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em]", tones[tone])}><Icon className="h-3.5 w-3.5" /> {title}</div>
      <ul className="space-y-1 text-xs text-ink">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function Status({ status }: { status: string }) {
  if (status === "pending") return <span className="flex items-center gap-1 text-xs font-medium text-brand-600"><Loader2 className="h-3 w-3 animate-spin" /> Reviewing…</span>;
  if (status === "reviewed") return <Badge tone="green">Reviewed</Badge>;
  if (status === "read") return <Badge tone="blue">Read</Badge>;
  if (status === "blocked") return <Badge tone="amber">Not public</Badge>;
  return <Badge tone="amber">Couldn&apos;t review</Badge>;
}
