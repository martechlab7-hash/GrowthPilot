"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import type { Recommendation } from "@/domain/types";
import { Badge, Button, Input, Label, Select } from "@/components/ui";
import type { CaseTabProps } from "./Workspace";

const STATUS = { planned: "Planned", live: "Live", completed: "Completed", dropped: "Dropped" } as const;

/** Close the loop: record what the recommendation actually delivered. */
export function OutcomeTracker({ r, ctl, canEdit }: { r: Recommendation; ctl: CaseTabProps["ctl"]; canEdit: boolean }) {
  const o = r.outcome;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<keyof typeof STATUS>(o?.status ?? "planned");
  const [lift, setLift] = useState(o?.actualLiftPct !== undefined ? String(o.actualLiftPct) : "");
  const [notes, setNotes] = useState(o?.notes ?? "");
  const forecast = o?.forecastLiftPct ?? r.expectedLiftPct;
  const ratio = o?.actualLiftPct !== undefined && forecast ? o.actualLiftPct / forecast : null;
  const label = `Outcome ${r.id}`;

  return (
    <div className="rounded-xl border border-line bg-canvas/50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Target className="h-4 w-4 text-brand-600" />
        <span className="font-medium">Outcome</span>
        {o ? <Badge tone={o.status === "completed" ? "green" : o.status === "dropped" ? "neutral" : "blue"}>{STATUS[o.status]}</Badge> : <span className="text-muted">Not tracked yet</span>}
        {ratio !== null && (
          <Badge tone={ratio >= 1 ? "green" : ratio >= 0.6 ? "amber" : "red"}>
            Delivered {o!.actualLiftPct}% vs forecast {forecast}% ({Math.round(ratio * 100) / 100}×)
          </Badge>
        )}
        {canEdit && !open && <button className="ml-auto text-xs font-medium text-brand-600" onClick={() => setOpen(true)}>{o ? "Update" : "Track outcome"}</button>}
      </div>
      {o?.notes && !open && <p className="mt-1 text-xs text-muted">{o.notes}</p>}
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_10rem_minmax(0,1fr)_auto] sm:items-end">
          <div><Label htmlFor={`st-${r.id}`}>Status</Label><Select id={`st-${r.id}`} value={status} onChange={(e) => setStatus(e.target.value as keyof typeof STATUS)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
          <div><Label htmlFor={`lift-${r.id}`}>Measured lift (%)</Label><Input id={`lift-${r.id}`} inputMode="decimal" placeholder={forecast !== undefined ? `forecast ${forecast}` : "e.g. 5"} value={lift} onChange={(e) => setLift(e.target.value.replace(/[^\d.-]/g, ""))} /></div>
          <div><Label htmlFor={`notes-${r.id}`}>Notes</Label><Input id={`notes-${r.id}`} placeholder="Test vs control, period, caveats" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" loading={ctl.busy === label} disabled={status === "completed" && lift.trim() === ""} onClick={async () => {
              const ok = await ctl.run(label, `/recommendations/${r.id}/outcome`, { method: "PUT", body: { status, ...(lift.trim() !== "" ? { actualLiftPct: Number(lift) } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) } });
              if (ok) setOpen(false);
            }}>Save</Button>
          </div>
          <p className="text-xs text-muted sm:col-span-4">Completed results calibrate future forecasts across your organisation.</p>
        </div>
      )}
    </div>
  );
}
