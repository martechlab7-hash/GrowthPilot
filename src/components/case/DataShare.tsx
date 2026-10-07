"use client";

import { useRef, useState } from "react";
import { Database, FileText, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { Dataset } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, Input, Label, Textarea } from "@/components/ui";
import { parseDelimited, toCsv, type Table } from "@/lib/data/csv";
import { detectPiiColumns, maskColumns, maskFreeText, type PiiColumn } from "@/lib/data/pii";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "./Workspace";

const MAX_FILE = 5 * 1024 * 1024;
const MAX_SEND = 2_500_000;

type Choice = "mask" | "remove" | "keep";
type Draft =
  | { kind: "table"; name: string; table: Table; pii: PiiColumn[]; choices: Record<number, Choice>; truncated: boolean }
  | { kind: "text"; name: string; text: string };

/** Personal-data reminder shown wherever data can be shared. */
export function PiiNotice({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950", compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm")}>
      <ShieldCheck className={cn("shrink-0 text-emerald-600", compact ? "mt-px h-4 w-4" : "mt-0.5 h-5 w-5")} />
      <p>
        <span className="font-semibold">Please don&apos;t share customer personal data</span> such as names, emails, phone numbers, addresses or ID numbers.
        Aggregated numbers (by month, segment, channel) are ideal. If a customer ID is needed, mask it first. We flag and mask anything that looks personal before upload.
      </p>
    </div>
  );
}

export function DataShare({ view, ctl, canContribute }: CaseTabProps) {
  const datasets = view.case.datasets ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = ctl.busy === "Sharing data";

  const load = (name: string, text: string) => {
    setErr(null);
    const looksTabular = /\.(csv|tsv|txt)$/i.test(name) || /[,\t;]/.test(text.split(/\r?\n/)[0] ?? "");
    const table = looksTabular ? parseDelimited(text) : null;
    if (table && table.headers.length > 1 && table.rows.length > 0) {
      const pii = detectPiiColumns(table);
      setDraft({ kind: "table", name, table, pii, choices: Object.fromEntries(pii.map((p) => [p.index, "mask" as Choice])), truncated: false });
    } else {
      setDraft({ kind: "text", name, text });
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) return setErr("That file is over 5 MB. Please share an aggregated export (e.g. by month and segment) instead of raw rows.");
    if (!/\.(csv|tsv|txt|json|md)$/i.test(f.name)) return setErr("Please share a CSV, TSV or text file. For Excel, use File → Save As → CSV.");
    load(f.name.replace(/\.[a-z]+$/i, ""), await f.text());
  };

  const submit = async () => {
    if (!draft) return;
    let content: string;
    let masked: string[] = [];
    let removed: string[] = [];
    let kept: string[] = [];
    if (draft.kind === "table") {
      const mask = draft.pii.filter((p) => draft.choices[p.index] === "mask").map((p) => p.index);
      const remove = draft.pii.filter((p) => draft.choices[p.index] === "remove").map((p) => p.index);
      masked = mask.map((i) => draft.table.headers[i]!);
      removed = remove.map((i) => draft.table.headers[i]!);
      kept = draft.pii.filter((p) => draft.choices[p.index] === "keep").map((p) => p.name);
      const safe = maskColumns(draft.table, mask, remove);
      content = toCsv(safe);
      // Keep the upload small: profile the first rows that fit.
      while (content.length > MAX_SEND && safe.rows.length > 100) {
        safe.rows = safe.rows.slice(0, Math.floor(safe.rows.length * 0.8));
        content = toCsv(safe);
      }
    } else {
      content = maskFreeText(draft.text).text.slice(0, MAX_SEND);
    }
    const ok = await ctl.run("Sharing data", "/datasets", {
      body: { name: draft.name || "Shared data", kind: draft.kind, content, ...(note.trim() ? { note: note.trim() } : {}), maskedColumns: masked, removedColumns: removed, keptColumns: kept },
    });
    if (ok) {
      setDraft(null);
      setNote("");
      setPaste("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader
        title="Share data"
        description="Upload a CSV export or paste numbers or notes. Pilot reads a statistical profile (column ranges, totals, top values and a short masked sample) and uses it in the diagnosis. The raw file is not stored."
      />
      <CardBody className="space-y-4">
        <PiiNotice />

        {canContribute && !draft && (
          <div className="grid gap-4 md:grid-cols-2">
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas/50 px-4 py-8 text-center text-sm transition hover:border-brand-500 hover:bg-brand-50/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void onFile(e.dataTransfer.files[0]); }}
            >
              <Upload className="h-6 w-6 text-brand-600" />
              <span className="font-medium">Drop a CSV or text file, or click to browse</span>
              <span className="text-xs text-muted">CSV, TSV or TXT · up to 5 MB</span>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json,.md,text/csv,text/plain" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Upload a data file" />
            </label>
            <div className="space-y-2">
              <Label htmlFor="paste-data">Or paste data or notes</Label>
              <Textarea id="paste-data" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"month,segment,bookings\n2026-01,Frequent flyers,4210\n2026-02,Frequent flyers,3890"} />
              <Button size="sm" variant="outline" disabled={!paste.trim()} onClick={() => load("Pasted data", paste)}>Review before sharing</Button>
            </div>
          </div>
        )}

        {draft && (
          <div className="space-y-4 rounded-xl border border-brand-600/20 bg-white p-4 shadow-card">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ds-name">Name</Label>
                <Input id="ds-name" value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ds-note">What is it? (optional)</Label>
                <Input id="ds-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly bookings by route, Jan–Sep 2026" />
              </div>
            </div>

            {draft.kind === "table" ? (
              <>
                <p className="text-sm text-muted">{draft.table.rows.length.toLocaleString("en")} rows · {draft.table.headers.length} columns</p>
                {draft.pii.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">These columns look like personal data. Choose what to do before sharing:</p>
                    {draft.pii.map((p) => (
                      <div key={p.index} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-40 font-medium">{p.name}</span>
                        <span className="text-xs text-amber-800">{p.reason}</span>
                        <div className="ml-auto flex gap-1">
                          {(["mask", "remove", "keep"] as Choice[]).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setDraft({ ...draft, choices: { ...draft.choices, [p.index]: c } })}
                              className={cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1", draft.choices[p.index] === c ? "bg-amber-600 text-white ring-amber-600" : "bg-white ring-amber-300 hover:bg-amber-100")}
                            >
                              {c === "mask" ? "Mask (pseudonymise)" : c === "remove" ? "Remove column" : "Not personal, keep"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Preview table={draft.table} pii={draft.pii} choices={draft.choices} />
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted">Shared as notes. Emails and phone numbers are removed automatically ({maskFreeText(draft.text).masked} found).</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 text-xs">{maskFreeText(draft.text).text.slice(0, 2000)}</pre>
              </div>
            )}
            <ErrorNote error={err} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button loading={busy} onClick={() => void submit()}><ShieldCheck className="h-4 w-4" /> Share with Pilot</Button>
            </div>
          </div>
        )}
        {!draft && <ErrorNote error={err} />}

        {datasets.length > 0 && <DatasetList datasets={datasets} onRemove={canContribute ? (id) => void ctl.run("Removing data", `/datasets/${id}`, { method: "DELETE" }) : undefined} />}
      </CardBody>
    </Card>
  );
}

function Preview({ table, pii, choices }: { table: Table; pii: PiiColumn[]; choices: Record<number, Choice> }) {
  const flagged = new Map(pii.map((p) => [p.index, choices[p.index]]));
  const shown = maskColumns(
    { headers: table.headers, rows: table.rows.slice(0, 5) },
    pii.filter((p) => choices[p.index] === "mask").map((p) => p.index),
    [],
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-xs">
        <thead className="bg-canvas text-left">
          <tr>{shown.headers.map((h, i) => <th key={i} className={cn("whitespace-nowrap px-2 py-1.5 font-semibold", flagged.get(i) === "remove" && "text-subtle line-through", flagged.get(i) === "mask" && "text-amber-700")}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {shown.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={cn("whitespace-nowrap px-2 py-1", flagged.get(j) === "remove" && "italic text-subtle")}>{flagged.get(j) === "remove" ? "removed" : v}</td>)}</tr>)}
        </tbody>
      </table>
      <p className="border-t border-line px-2 py-1 text-[11px] text-subtle">Preview of the first 5 rows as they will be shared.</p>
    </div>
  );
}

function DatasetList({ datasets, onRemove }: { datasets: Dataset[]; onRemove?: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">Shared with Pilot</div>
      {datasets.map((d) => (
        <details key={d.id} className="group rounded-xl border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{d.kind === "table" ? <Database className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{d.name}</span>
              <span className="block truncate text-xs text-muted">
                {d.kind === "table" ? `${d.rowCount?.toLocaleString("en")} rows · ${d.columns?.length} columns` : "Notes"}
                {d.note ? ` · ${d.note}` : ""}
              </span>
            </span>
            {(d.maskedColumns.length > 0 || d.removedColumns.length > 0 || (d.maskedItems ?? 0) > 0) && <Badge tone="green">PII masked</Badge>}
            {onRemove && (
              <button type="button" aria-label={`Remove ${d.name}`} onClick={(e) => { e.preventDefault(); onRemove(d.id); }} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            )}
          </summary>
          <div className="border-t border-line px-3 py-3 text-xs">
            {d.columns ? (
              <table className="w-full">
                <thead className="text-left text-subtle"><tr><th className="pb-1 pr-3">Column</th><th className="pb-1 pr-3">Type</th><th className="pb-1">Profile</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {d.columns.map((c) => (
                    <tr key={c.name} className="align-top">
                      <td className="py-1 pr-3 font-medium">{c.name}{d.maskedColumns.includes(c.name) && <span className="ml-1 text-amber-700">(masked)</span>}</td>
                      <td className="py-1 pr-3 text-muted">{c.type}</td>
                      <td className="py-1 text-muted">
                        {c.type === "number" ? `min ${c.min} · max ${c.max} · mean ${c.mean} · total ${c.sum}` : c.type === "date" ? `${c.min} → ${c.max}` : `${c.distinct} distinct${c.top?.length ? ` · ${c.top.slice(0, 3).map((t) => `${t.value} (${t.count})`).join(", ")}` : ""}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="whitespace-pre-wrap text-muted">{d.excerpt?.slice(0, 600)}</p>
            )}
            {d.removedColumns.length > 0 && <p className="mt-2 text-muted">Removed before sharing: {d.removedColumns.join(", ")}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}
