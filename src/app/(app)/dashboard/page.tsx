"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { CaseSummary, ProblemType } from "@/domain/types";
import { CaseCard } from "@/components/CaseCard";
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/useApi";
import { industryName, problemLabel } from "@/lib/labels";

export default function DashboardPage() {
  const { data, error, loading } = useApi<{ cases: CaseSummary[] }>("/api/cases");
  const cases = data?.cases ?? [];
  const counts = {
    active: cases.filter((c) => !["draft", "completed"].includes(c.status)).length,
    completed: cases.filter((c) => c.status === "completed").length,
    draft: cases.filter((c) => c.status === "draft").length,
  };
  const problems = tally(cases.flatMap((c) => c.problemTypes));
  const industries = tally(cases.map((c) => industryName(c.industryId)));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your marketing strategy cases and where they stand."
        action={<Link href="/cases/new"><Button><Plus className="h-4 w-4" /> New Marketing Case</Button></Link>}
      />
      <ErrorNote error={error} />
      {loading ? (
        <Spinner label="Loading cases…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {([["Active", counts.active], ["Completed", counts.completed], ["Draft", counts.draft]] as const).map(([label, n]) => (
              <Card key={label} className="p-5">
                <div className="text-sm text-muted">{label} cases</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">{n}</div>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent cases</h2>
              {cases.length === 0 ? (
                <EmptyState
                  title="No cases yet"
                  description="Describe a business or marketing problem and the AI consultant will start a structured diagnostic."
                  action={<Link href="/cases/new"><Button>Create your first case</Button></Link>}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {cases.slice(0, 6).map((c) => <CaseCard key={c.id} c={c} />)}
                </div>
              )}
            </div>
            <Card>
              <CardHeader title="Insights" description="Across your organization's cases" />
              <CardBody className="space-y-5 text-sm">
                <Tally title="Common problems" rows={problems.map(([k, n]) => [problemLabel(k as ProblemType), n])} />
                <Tally title="Industries" rows={industries} />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Tally({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <div className="mb-2 font-medium">{title}</div>
      {rows.length === 0 ? (
        <p className="text-muted">Not enough cases yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 5).map(([k, n]) => (
            <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums text-muted">{n}</span></li>
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
