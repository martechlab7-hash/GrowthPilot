"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { useApi } from "@/lib/client/useApi";

interface Precedent {
  id: string;
  name: string;
  similarity: number;
  why: string[];
  validatedHypotheses: string[];
  recommendations: { title: string; priority: string; outcome?: string }[];
}

/** Organisation memory: past cases like this one, what was validated and what it delivered. */
export function SimilarCases({ caseId }: { caseId: string }) {
  const { data } = useApi<{ similar: Precedent[] }>(`/api/cases/${caseId}/similar`);
  const list = data?.similar ?? [];
  if (!list.length) return null;
  return (
    <Card>
      <CardHeader title="Similar past cases" description="From your organisation's history. Pilot also uses these as precedent (clearly labelled) when it recommends." />
      <CardBody className="space-y-3">
        {list.map((p) => (
          <div key={p.id} className="rounded-xl border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <History className="h-4 w-4 text-brand-600" />
              <Link href={`/cases/${p.id}`} className="font-semibold hover:text-brand-600">{p.name}</Link>
              <Badge>{Math.round(p.similarity * 100)}% similar</Badge>
              <span className="text-xs text-muted">{p.why.join(" · ")}</span>
            </div>
            {p.validatedHypotheses.length > 0 && <p className="mt-2 text-xs"><span className="font-medium">Validated:</span> {p.validatedHypotheses.join(" · ")}</p>}
            {p.recommendations.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {p.recommendations.map((r) => <li key={r.title}>{r.priority} · {r.title}{r.outcome && <span className="font-medium text-ink"> — {r.outcome}</span>}</li>)}
              </ul>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
