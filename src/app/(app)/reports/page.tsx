"use client";

import Link from "next/link";
import type { CaseSummary } from "@/domain/types";
import { Card, EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/useApi";
import { industryName, timeAgo } from "@/lib/labels";

export default function ReportsPage() {
  const { data, loading, error } = useApi<{ cases: CaseSummary[] }>("/api/cases?filter=completed");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Reports" description="Completed strategies. Open a report to view it on the web or download PDF, Word or PowerPoint." />
      <ErrorNote error={error} />
      {loading ? <Spinner /> : data?.cases.length ? (
        <div className="space-y-3">
          {data.cases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}?tab=report`}>
              <Card className="mb-3 flex items-center justify-between p-4 hover:border-brand-600/40">
                <div><div className="font-medium">{c.name}</div><div className="text-sm text-muted">{industryName(c.industryId)}</div></div>
                <div className="text-sm text-muted">{timeAgo(c.updatedAt)}</div>
              </Card>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No completed reports yet" description="Reports appear here once a case's strategy report is generated." />}
    </div>
  );
}
