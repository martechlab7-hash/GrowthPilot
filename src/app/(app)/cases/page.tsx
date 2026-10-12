"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { CaseSummary } from "@/domain/types";
import { CaseCollection } from "@/components/CaseCollection";
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
        <CaseCollection key={filter ?? "all"} items={data.cases} />
      ) : (
        <EmptyState title="No cases here" action={<Link href="/cases/new"><Button>New case</Button></Link>} />
      )}
    </>
  );
}
