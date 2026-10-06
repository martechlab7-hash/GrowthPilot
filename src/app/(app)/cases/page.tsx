"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { CaseSummary } from "@/domain/types";
import { CaseCard } from "@/components/CaseCard";
import { Button, EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/useApi";

const TITLES: Record<string, string> = { drafts: "Draft cases", completed: "Completed cases", active: "Active cases" };

export default function CasesPage() {
  const filter = useSearchParams().get("filter");
  const { data, error, loading } = useApi<{ cases: CaseSummary[] }>(`/api/cases${filter ? `?filter=${filter}` : ""}`);
  return (
    <>
      <PageHeader title={TITLES[filter ?? ""] ?? "All cases"} action={<Link href="/cases/new"><Button><Plus className="h-4 w-4" /> New Marketing Case</Button></Link>} />
      <ErrorNote error={error} />
      {loading ? (
        <Spinner label="Loading…" />
      ) : data?.cases.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.cases.map((c) => <CaseCard key={c.id} c={c} />)}</div>
      ) : (
        <EmptyState title="No cases here" action={<Link href="/cases/new"><Button>New case</Button></Link>} />
      )}
    </>
  );
}
