"use client";

import Link from "next/link";
import type { CaseSummary } from "@/domain/types";
import { Badge, Card, Progress } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE, industryName, problemLabel, timeAgo } from "@/lib/labels";

export function CaseCard({ c }: { c: CaseSummary }) {
  return (
    <Link href={`/cases/${c.id}`} className="block">
      <Card className="h-full p-5 transition hover:border-brand-600/40 hover:shadow">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug">{c.name}</h3>
          <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{industryName(c.industryId)}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {c.problemTypes.slice(0, 3).map((p) => <Badge key={p}>{problemLabel(p)}</Badge>)}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={c.progress} />
          <span className="text-xs tabular-nums text-muted">{c.progress}%</span>
        </div>
        <p className="mt-2 text-xs text-muted">Updated {timeAgo(c.updatedAt)}</p>
      </Card>
    </Link>
  );
}
