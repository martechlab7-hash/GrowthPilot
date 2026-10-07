"use client";

import { useState } from "react";
import { BarChart3, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, Label, Skeleton } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";

interface Benchmark {
  id: string; metric: string; value: string; industry?: string; region?: string; period?: string;
  sourceTitle: string; sourceUrl: string; notes?: string; createdBy: string;
}

const EMPTY = { metric: "", value: "", industry: "", region: "", period: "", sourceTitle: "", sourceUrl: "", notes: "" };

/** Benchmarks your team has sourced. A source link is required for every entry. */
export function BenchmarkLibrary() {
  const { me } = useAuth();
  const role = me?.onboarded ? me.profile.role : "viewer";
  const uid = me?.onboarded ? me.profile.id : "";
  const canAdd = role !== "viewer";
  const { data, error, loading, setData } = useApi<{ benchmarks: Benchmark[] }>("/api/knowledge/benchmarks");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = data?.benchmarks ?? [];

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const url = /^https?:\/\//i.test(f.sourceUrl.trim()) ? f.sourceUrl.trim() : `https://${f.sourceUrl.trim()}`;
      const body = Object.fromEntries(Object.entries({ ...f, sourceUrl: url }).filter(([, v]) => v.trim() !== ""));
      const { benchmark } = await apiFetch<{ benchmark: Benchmark }>("/api/knowledge/benchmarks", { body });
      setData({ benchmarks: [...list, benchmark].sort((a, b) => a.metric.localeCompare(b.metric)) });
      setF(EMPTY); setOpen(false);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof EMPTY, label: string, placeholder: string, required?: boolean) => (
    <div><Label htmlFor={`bm-${k}`}>{label}{required ? "" : " (optional)"}</Label><Input id={`bm-${k}`} required={required} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={placeholder} /></div>
  );

  return (
    <Card>
      <CardHeader
        title="Benchmark library"
        description="Industry figures your team has sourced (e.g. from a published report). Every benchmark needs its source; Pilot cites it and keeps it separate from your own data."
        action={canAdd && !open ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add benchmark</Button> : undefined}
      />
      <CardBody className="space-y-4">
        {open && (
          <form className="grid gap-3 rounded-xl border border-line bg-canvas p-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            {field("metric", "Metric", "e.g. Email open rate", true)}
            {field("value", "Value or range", "e.g. 18–22%", true)}
            {field("industry", "Industry", "e.g. Airlines")}
            {field("region", "Region", "e.g. India")}
            {field("period", "Period", "e.g. 2025")}
            {field("notes", "Notes", "Definition or caveats")}
            <div className="sm:col-span-1">{field("sourceTitle", "Source", "e.g. Vendor benchmark report 2025", true)}</div>
            <div className="sm:col-span-2">{field("sourceUrl", "Source link", "https://…", true)}</div>
            <div className="flex items-end justify-end gap-2 sm:col-span-3">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setErr(null); }}>Cancel</Button>
              <Button type="submit" loading={busy}>Save benchmark</Button>
            </div>
            <div className="sm:col-span-3"><ErrorNote error={err} /></div>
          </form>
        )}
        {!open && <ErrorNote error={err ?? error} />}
        {loading ? <Skeleton className="h-12" /> : list.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-5 text-sm text-muted">
            <BarChart3 className="h-5 w-5 shrink-0" /> No benchmarks yet. Add the figures you trust, with their source, and Pilot will compare against them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 pr-3">Metric</th><th className="pb-2 pr-3">Value</th><th className="pb-2 pr-3">Scope</th><th className="pb-2 pr-3">Source</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {list.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-2 pr-3 font-medium">{b.metric}{b.notes && <div className="text-xs font-normal text-muted">{b.notes}</div>}</td>
                    <td className="py-2 pr-3 tabular-nums">{b.value}</td>
                    <td className="py-2 pr-3 text-muted">{[b.industry, b.region, b.period].filter(Boolean).join(" · ") || "All"}</td>
                    <td className="py-2 pr-3"><a href={b.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-brand-600 hover:underline">{b.sourceTitle} <ExternalLink className="h-3 w-3" /></a></td>
                    <td className="py-2 text-right">
                      {(b.createdBy === uid || ["owner", "admin", "strategist"].includes(role)) && (
                        <button aria-label={`Remove ${b.metric}`} onClick={async () => { await apiFetch(`/api/knowledge/benchmarks/${b.id}`, { method: "DELETE" }); setData({ benchmarks: list.filter((x) => x.id !== b.id) }); }} className="rounded-md p-1 text-subtle hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
