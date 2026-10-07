"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, CheckCircle2, FilePen, Lightbulb, Plus, Sparkles, Stethoscope, Target } from "lucide-react";
import type { CaseSummary, ProblemType } from "@/domain/types";
import { CaseCard } from "@/components/CaseCard";
import { Button, Card, CardBody, CardHeader, ErrorNote, Skeleton, StatCard } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";
import { industryName, problemLabel } from "@/lib/labels";
import { firstName as getFirstName, needsName } from "@/lib/name";
import { NameForm } from "@/components/account/NameForm";

const FLOW = [
  { icon: FilePen, title: "Describe", text: "State the business problem in plain language." },
  { icon: Sparkles, title: "Interview", text: "Answer the highest-value questions first." },
  { icon: Stethoscope, title: "Diagnose", text: "Frameworks + evidence → root causes." },
  { icon: Lightbulb, title: "Validate", text: "Agree, challenge or edit every hypothesis." },
  { icon: Target, title: "Strategise", text: "Prioritised plan, KPIs, economics, report." },
];

export default function DashboardPage() {
  const { me } = useAuth();
  const { data, error, loading } = useApi<{ cases: CaseSummary[] }>("/api/cases");
  const cases = data?.cases ?? [];
  const counts = {
    active: cases.filter((c) => !["draft", "completed"].includes(c.status)).length,
    completed: cases.filter((c) => c.status === "completed").length,
    draft: cases.filter((c) => c.status === "draft").length,
  };
  const awaiting = cases.filter((c) => c.status === "validation");
  const problems = tally(cases.flatMap((c) => c.problemTypes));
  const industries = tally(cases.map((c) => industryName(c.industryId)));
  const firstName = me?.onboarded && !needsName(me.profile.displayName) ? getFirstName(me.profile.displayName) : "";
  const askName = !!me?.onboarded && needsName(me.profile.displayName);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {askName && (
        <Card className="border-brand-600/20">
          <CardBody className="flex flex-wrap items-center gap-4">
            <OwlSays size={56}>Hi! What should I call you?</OwlSays>
            <div className="ml-auto"><NameForm submitLabel="Save name" autoFocus /></div>
          </CardBody>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="relative flex flex-wrap items-center justify-between gap-6 bg-gradient-to-br from-brand-700 via-brand to-violet-700 px-6 py-7 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Dashboard</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you{firstName ? `, ${firstName}` : ""}.</h1>
            <p className="mt-2 text-sm text-white/80">
              {awaiting.length
                ? `${awaiting.length} case${awaiting.length > 1 ? "s are" : " is"} waiting for your hypothesis review.`
                : "Describe a marketing problem and I'll run a structured diagnostic before recommending anything."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/cases/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-700 shadow-pop transition hover:bg-brand-50">
                <Plus className="h-4 w-4" /> New marketing case
              </Link>
              {awaiting[0] && (
                <Link href={`/cases/${awaiting[0].id}?tab=hypotheses`} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10">
                  Review hypotheses <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
          <div className="relative hidden rounded-3xl bg-white/95 p-2 shadow-pop sm:block">
            <OwlSays size={96}>I&apos;m Pilot. I investigate before I recommend.</OwlSays>
          </div>
        </div>
      </Card>

      <ErrorNote error={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active cases" value={loading ? "–" : counts.active} icon={<Briefcase className="h-4 w-4" />} hint="In discovery, validation or strategy" />
        <StatCard label="Completed" value={loading ? "–" : counts.completed} icon={<CheckCircle2 className="h-4 w-4" />} hint="Strategy report generated" />
        <StatCard label="Drafts" value={loading ? "–" : counts.draft} icon={<FilePen className="h-4 w-4" />} hint="Not yet started" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Recent cases</h2>
            {cases.length > 0 && <Link href="/cases" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>}
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
          ) : cases.length === 0 ? (
            <Card>
              <CardBody className="py-8">
                <OwlSays size={80}>
                  <span className="font-semibold">No cases yet.</span> Tell me about a problem, e.g. &ldquo;repeat bookings dropped 12% this year&rdquo;, and I&apos;ll start the diagnostic.
                  <div className="mt-3"><Link href="/cases/new"><Button size="sm">Create your first case</Button></Link></div>
                </OwlSays>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">{cases.slice(0, 6).map((c) => <CaseCard key={c.id} c={c} />)}</div>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="How a case works" />
            <CardBody>
              <ol className="space-y-3">
                {FLOW.map((f, i) => (
                  <li key={f.title} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><f.icon className="h-4 w-4" /></span>
                    <div className="text-sm"><div className="font-medium">{i + 1}. {f.title}</div><div className="text-muted">{f.text}</div></div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Insights" description="Across your organization's cases" />
            <CardBody className="space-y-5 text-sm">
              <Tally title="Common problems" rows={problems.map(([k, n]) => [problemLabel(k as ProblemType), n])} />
              <Tally title="Industries" rows={industries} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tally({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div>
      <div className="mb-2 font-medium">{title}</div>
      {rows.length === 0 ? (
        <p className="text-muted">Not enough cases yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map(([k, n]) => (
            <li key={k}>
              <div className="flex justify-between text-[13px]"><span>{k}</span><span className="tabular-nums text-muted">{n}</span></div>
              <div className="mt-1 h-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function tally(xs: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
