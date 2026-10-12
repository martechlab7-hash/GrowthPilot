"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import type { CaseSummary } from "@/domain/types";
import { CaseCard } from "@/components/CaseCard";
import { Badge } from "@/components/ui";
import { TYPE_LABEL } from "@/components/strategy/shared";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUS_TONE, industryName, problemLabel, timeAgo } from "@/lib/labels";

type View = "list" | "tile";
const PAGE_SIZE: Record<View, number> = { list: 25, tile: 15 };
const STORAGE_KEY = "growthpilot.collectionView";

function readView(): View {
  try {
    return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "tile";
  } catch {
    return "tile";
  }
}

/** Cases or strategies as tiles (15 a page) or a list (25 a page). The chosen view is remembered per browser. */
export function CaseCollection({ items }: { items: CaseSummary[] }) {
  const [view, setView] = useState<View>("tile");
  const [page, setPage] = useState(1);
  // localStorage is only readable after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setView(readView()), []);

  const size = PAGE_SIZE[view];
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const shown = items.slice((current - 1) * size, current * size);

  const choose = (v: View) => {
    if (v === view) return;
    // Keep the first visible item on screen when the page size changes.
    const first = (current - 1) * size;
    setView(v);
    setPage(Math.floor(first / PAGE_SIZE[v]) + 1);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* private mode: the view just isn't remembered */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {items.length === 0 ? "Nothing here" : `Showing ${(current - 1) * size + 1}–${Math.min(current * size, items.length)} of ${items.length}`}
        </p>
        <div className="inline-flex rounded-xl border border-line bg-white p-0.5" role="group" aria-label="View">
          {([["tile", LayoutGrid, "Tiles"], ["list", List, "List"]] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => choose(v)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition", view === v ? "bg-ink text-white" : "text-muted hover:text-ink")}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "tile" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((c) => <CaseCard key={c.id} c={c} />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => {
                  const href = c.kind === "strategy" ? `/strategies/${c.id}` : `/cases/${c.id}`;
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td className="max-w-[22rem] px-4 py-2.5">
                        <Link href={href} className="block truncate font-medium hover:text-brand-600">{c.name}</Link>
                        <div className="truncate text-xs text-muted">{industryName(c.industryId)}</div>
                      </td>
                      <td className="px-4 py-2.5"><Badge tone={STATUS_TONE[c.status]}>{statusLabel(c)}</Badge></td>
                      <td className="px-4 py-2.5 text-muted">
                        {c.kind === "strategy" ? (c.strategyType ? TYPE_LABEL[c.strategyType] : "Strategy") : c.problemTypes.slice(0, 2).map(problemLabel).join(", ") || "Not set"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${c.progress}%` }} /></div>
                          <span className="tabular-nums text-xs text-muted">{c.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{timeAgo(c.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
          <PageButton disabled={current === 1} onClick={() => setPage(current - 1)} label="Previous page"><ChevronLeft className="h-4 w-4" /></PageButton>
          {pageNumbers(current, pages).map((n, i) =>
            n === null ? <span key={`gap-${i}`} className="px-1 text-muted">…</span> : (
              <PageButton key={n} active={n === current} onClick={() => setPage(n)} label={`Page ${n}`}>{n}</PageButton>
            ),
          )}
          <PageButton disabled={current === pages} onClick={() => setPage(current + 1)} label="Next page"><ChevronRight className="h-4 w-4" /></PageButton>
        </nav>
      )}
    </div>
  );
}

function statusLabel(c: CaseSummary) {
  if (c.kind !== "strategy") return STATUS_LABEL[c.status];
  if (c.strategyStatus === "approved" || c.status === "completed") return "Approved";
  if (c.strategyStatus === "generated") return "Strategy drafted";
  return STATUS_LABEL[c.status];
}

function PageButton({ children, onClick, disabled, active, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn("flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition disabled:opacity-40", active ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink")}
    >
      {children}
    </button>
  );
}

/** 1 … 4 5 6 … 12: first, last and the neighbours of the current page. */
export function pageNumbers(current: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null);
    out.push(n);
  });
  return out;
}
