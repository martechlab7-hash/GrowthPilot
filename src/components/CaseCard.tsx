"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CaseSummary } from "@/domain/types";
import { Badge } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE, industryName, problemLabel, timeAgo } from "@/lib/labels";

export function CaseCard({ c }: { c: CaseSummary }) {
  return (
    <Link href={`/cases/${c.id}`} className="group block h-full">
      <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-100 group-hover:shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
          <ArrowUpRight className="h-4 w-4 text-subtle transition group-hover:text-brand-600" />
        </div>
        <h3 className="mt-3 line-clamp-2 font-semibold leading-snug tracking-tight">{c.name}</h3>
        <p className="mt-1 text-sm text-muted">{industryName(c.industryId)}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {c.problemTypes.slice(0, 3).map((p) => <Badge key={p}>{problemLabel(p)}</Badge>)}
        </div>
        <div className="mt-auto pt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
            <span>Updated {timeAgo(c.updatedAt)}</span>
            <span className="font-medium tabular-nums text-ink">{c.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${c.progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
