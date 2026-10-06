"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DecisionLogEntry } from "@/domain/types";
import type { VersionDiff } from "@/server/services/versionDiff";
import { Button, Card, CardBody, CardHeader, ErrorNote, Select, Spinner } from "@/components/ui";
import { apiDownload, apiFetch } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";
import type { CaseTabProps } from "./Workspace";

interface History {
  versions: { id: string; version: number; label: string; createdAt: string }[];
  decisions: DecisionLogEntry[];
}

export function HistoryView({ view, canManage }: CaseTabProps) {
  const c = view.case;
  const router = useRouter();
  const { data, loading, error } = useApi<History>(`/api/cases/${c.id}/history?r=${c.analysisVersion}`);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading || !data) return error ? <ErrorNote error={error} /> : <Spinner label="Loading history…" />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Versions" description="A snapshot is saved whenever hypotheses, recommendations or the report are generated." />
        <CardBody className="space-y-4">
          {data.versions.length === 0 ? (
            <p className="text-sm text-muted">No versions yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-line text-sm">
                {data.versions.map((v) => <li key={v.id} className="flex justify-between py-2"><span>Version {v.version} — {v.label}</span><span className="text-muted">{new Date(v.createdAt).toLocaleString()}</span></li>)}
              </ul>
              {data.versions.length > 1 && (
                <div className="flex flex-wrap items-end gap-2">
                  {[[a, setA, "From"], [b, setB, "To"]].map(([val, set, label]) => (
                    <div key={label as string} className="w-56">
                      <label className="mb-1 block text-xs text-muted">{label as string}</label>
                      <Select value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
                        <option value="">Select version</option>
                        {data.versions.map((v) => <option key={v.id} value={v.id}>Version {v.version} — {v.label}</option>)}
                      </Select>
                    </div>
                  ))}
                  <Button variant="outline" disabled={!a || !b || a === b} onClick={async () => {
                    setErr(null);
                    try { setDiff(await apiFetch<VersionDiff>(`/api/cases/${c.id}/versions/compare?a=${a}&b=${b}`)); } catch (e) { setErr((e as Error).message); }
                  }}>Compare versions</Button>
                </div>
              )}
              <ErrorNote error={err} />
              {diff && <DiffView d={diff} />}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Decision log" />
        <CardBody>
          {data.decisions.length === 0 ? <p className="text-sm text-muted">No decisions recorded yet.</p> : (
            <ul className="space-y-3 text-sm">
              {data.decisions.map((d) => (
                <li key={d.id} className="rounded-lg border border-line p-3">
                  <div className="flex justify-between gap-2"><span className="font-medium">{d.decision}</span><span className="text-xs text-muted">{new Date(d.createdAt).toLocaleString()}</span></div>
                  {d.reason && <div className="mt-1"><span className="text-muted">Reason:</span> {d.reason}</div>}
                  {d.impact && <div><span className="text-muted">Impact:</span> {d.impact}</div>}
                  {d.evidence.length > 0 && <details className="mt-1"><summary className="cursor-pointer text-xs text-muted">Evidence ({d.evidence.length})</summary><ul className="mt-1 list-disc pl-5">{d.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Data & privacy" />
        <CardBody className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => apiDownload(`/api/cases/${c.id}/export`).catch((e: Error) => setErr(e.message))}>Export case data (JSON)</Button>
          {canManage && (
            <Button variant="danger" onClick={async () => {
              if (!confirm(`Permanently delete "${c.name}" and its history? This cannot be undone.`)) return;
              try { await apiFetch(`/api/cases/${c.id}`, { method: "DELETE" }); router.replace("/cases"); } catch (e) { setErr((e as Error).message); }
            }}>Delete case</Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DiffView({ d }: { d: VersionDiff }) {
  const nothing = !d.context.length && !d.hypotheses.added.length && !d.hypotheses.removed.length && !d.hypotheses.statusChanged.length && !d.recommendations.added.length && !d.recommendations.removed.length && !d.recommendations.priorityChanged.length && !d.diagnosisChanged && !d.economicsChanged;
  return (
    <div className="space-y-3 rounded-lg bg-canvas p-4 text-sm">
      <div className="font-medium">Version {d.from.version} → Version {d.to.version}</div>
      {nothing && <p className="text-muted">No material changes.</p>}
      {d.diagnosisChanged && <p>• Diagnosis changed.</p>}
      {d.economicsChanged && <p>• Economics changed.</p>}
      {d.context.length > 0 && <div><div className="font-medium">Context</div><ul className="list-disc pl-5">{d.context.map((x) => <li key={x.key}>{x.key}: {x.before ?? "—"} → {x.after ?? "—"}</li>)}</ul></div>}
      {(d.hypotheses.added.length > 0 || d.hypotheses.removed.length > 0 || d.hypotheses.statusChanged.length > 0) && (
        <div><div className="font-medium">Hypotheses</div><ul className="list-disc pl-5">
          {d.hypotheses.added.map((x) => <li key={`a${x}`}>Added: {x}</li>)}
          {d.hypotheses.removed.map((x) => <li key={`r${x}`}>Removed: {x}</li>)}
          {d.hypotheses.statusChanged.map((x) => <li key={`s${x.statement}`}>{x.statement}: {x.before} → {x.after}</li>)}
        </ul></div>
      )}
      {(d.recommendations.added.length > 0 || d.recommendations.removed.length > 0 || d.recommendations.priorityChanged.length > 0) && (
        <div><div className="font-medium">Recommendations</div><ul className="list-disc pl-5">
          {d.recommendations.added.map((x) => <li key={`a${x}`}>Added: {x}</li>)}
          {d.recommendations.removed.map((x) => <li key={`r${x}`}>Removed: {x}</li>)}
          {d.recommendations.priorityChanged.map((x) => <li key={`p${x.title}`}>{x.title}: {x.before} → {x.after}</li>)}
        </ul></div>
      )}
    </div>
  );
}
