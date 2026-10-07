"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ImagePlus, Link2, Loader2, Plus, ShieldAlert, Trash2, X, Zap } from "lucide-react";
import type { CommsScreenshot } from "@/domain/types";
import { Input, Select } from "@/components/ui";
import { apiFetch, apiObjectUrl } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import {
  analyzeCadence,
  CADENCE_FREQUENCIES,
  DAYS,
  formatCadenceRow,
  parseCadenceRow,
  type CadenceFrequency,
  type CadenceRow,
  type Day,
} from "@/engine/cadence";

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

const MAX_LINKS = 5;
const looksLikeUrl = (s: string) => /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]{2,}$/i.test(s.trim());

export function LinksInput({ value, onChange, disabled, placeholder }: { value: string[]; onChange: (v: string[]) => void; disabled: boolean; placeholder?: string }) {
  const rows = value.length ? value : [""];
  const set = (i: number, v: string) => onChange(rows.map((r, j) => (j === i ? v : r)));
  return (
    <div className="space-y-2" data-rich-input>
      {rows.map((r, i) => {
        const bad = r.trim() !== "" && !looksLikeUrl(r);
        return (
          <div key={i} className="flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-subtle" />
            <Input
              value={r}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && rows.length < MAX_LINKS && looksLikeUrl(r)) {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([...rows, ""]);
                }
              }}
              placeholder={placeholder || "https://www.example.com/landing-page"}
              disabled={disabled}
              inputMode="url"
              autoFocus={i === rows.length - 1}
              aria-label={`Link ${i + 1}`}
              aria-invalid={bad}
              className={cn(bad && "border-amber-400")}
            />
            {rows.length > 1 && (
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={disabled} className="rounded-lg p-2 text-subtle hover:bg-canvas hover:text-ink" aria-label={`Remove link ${i + 1}`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {rows.length < MAX_LINKS ? (
          <button type="button" onClick={() => onChange([...rows, ""])} disabled={disabled} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            <Plus className="h-3.5 w-3.5" /> Add another link
          </button>
        ) : <span />}
        <span className="text-xs text-subtle">Public pages only. I read the page text, never anything behind a login.</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screenshots                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_SHOTS = 6;
const SHOT_CHANNELS = ["Email", "SMS", "WhatsApp", "Push", "In-app", "RCS", "Web push", "Social", "Other"];

/** Downscale to at most 1280px and re-encode as JPEG so uploads stay small. */
async function shrink(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file could not be read as an image."));
      el.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    // Very tall email screenshots: keep them readable by capping height separately.
    const tall = Math.min(1, 2400 / (img.naturalHeight * scale));
    const w = Math.max(1, Math.round(img.naturalWidth * scale * tall));
    const h = Math.max(1, Math.round(img.naturalHeight * scale * tall));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let q = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", q);
    while (dataUrl.length > 1_150_000 && q > 0.4) {
      q -= 0.15;
      dataUrl = canvas.toDataURL("image/jpeg", q);
    }
    return { dataUrl, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ScreenshotsInput({
  caseId,
  value,
  onChange,
  disabled,
  known,
  channels,
}: {
  caseId: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  /** Screenshots already uploaded to the case. */
  known: CommsScreenshot[];
  channels: string[];
}) {
  const [items, setItems] = useState<CommsScreenshot[]>(() => known.filter((k) => value.includes(k.id)));
  const [channel, setChannel] = useState(() => channels.find((c) => SHOT_CHANNELS.includes(c)) ?? "Email");
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const add = async (files: File[]) => {
    setErr(null);
    const room = MAX_SHOTS - items.length;
    const list = files.filter((f) => /^image\/(png|jpe?g|webp|gif|heic|heif)$/i.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name)).slice(0, room);
    if (files.length && !list.length) return setErr(room <= 0 ? `Up to ${MAX_SHOTS} screenshots per case.` : "Please choose PNG, JPEG or WebP images.");
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        const { dataUrl, width, height } = await shrink(f);
        const { screenshot } = await apiFetch<{ screenshot: CommsScreenshot }>(`/api/cases/${caseId}/screenshots`, {
          body: { name: f.name.slice(0, 120) || "screenshot", channel, dataUrl, width, height },
        });
        setPreviews((p) => ({ ...p, [screenshot.id]: dataUrl }));
        setItems((xs) => {
          const next = [...xs, screenshot];
          onChange(next.map((x) => x.id));
          return next;
        });
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const remove = async (id: string) => {
    setItems((xs) => {
      const next = xs.filter((x) => x.id !== id);
      onChange(next.map((x) => x.id));
      return next;
    });
    await apiFetch(`/api/cases/${caseId}/screenshots/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-3" data-rich-input>
      <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
        <ShieldAlert className="mt-px h-4 w-4 shrink-0 text-amber-600" />
        <p>
          <span className="font-semibold">Crop or blur any customer details</span> (names, emails, phone numbers, order or account numbers) before uploading.
          A test send to yourself is ideal. Images go to your AI provider for review.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">These are</span>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} disabled={disabled} className="h-9 w-auto!" aria-label="Channel of the next screenshots">
          {SHOT_CHANNELS.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <span className="text-muted">messages</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) void add([...e.dataTransfer.files]); }}
        onPaste={(e) => { if (!disabled) void add([...e.clipboardData.files]); }}
        className={cn("grid grid-cols-2 gap-3 rounded-2xl border border-dashed p-3 transition sm:grid-cols-3", dragging ? "border-brand-500 bg-brand-50" : "border-line-strong bg-canvas/50")}
      >
        {items.map((s) => (
          <figure key={s.id} className="group relative overflow-hidden rounded-xl border border-line bg-white">
            <Thumb caseId={caseId} id={s.id} src={previews[s.id]} alt={s.name} />
            <figcaption className="flex items-center justify-between gap-1 border-t border-line px-2 py-1 text-[11px] text-muted">
              <span className="truncate">{s.channel ?? "Message"}</span>
              <button type="button" onClick={() => void remove(s.id)} disabled={disabled} className="rounded p-0.5 text-subtle hover:text-red-600" aria-label={`Remove ${s.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </figcaption>
          </figure>
        ))}
        {items.length + uploading < MAX_SHOTS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-center text-xs text-muted transition hover:border-brand-500 hover:text-brand-600"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="px-2">{uploading ? "Uploading…" : "Add screenshots"}</span>
            <span className="px-2 text-[10px] text-subtle">or drop / paste here</span>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }}
      />
      <p className="text-xs text-subtle">{items.length}/{MAX_SHOTS} · Images are resized before upload. I&apos;ll review the message, call to action, offer and personalisation in the background.</p>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

/** Screenshot thumbnail: uses the local preview, else fetches the stored image with auth. */
export function Thumb({ caseId, id, src, alt, className }: { caseId: string; id: string; src?: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | undefined>(src);
  useEffect(() => {
    if (src) return;
    let revoke: string | undefined;
    let live = true;
    apiObjectUrl(`/api/cases/${caseId}/screenshots/${id}`)
      .then((u) => {
        revoke = u;
        if (live) setUrl(u);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [caseId, id, src]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cn("aspect-[3/4] w-full bg-canvas object-cover object-top", className)} />
  ) : (
    <div className={cn("flex aspect-[3/4] w-full items-center justify-center bg-canvas", className)}><Loader2 className="h-4 w-4 animate-spin text-subtle" /></div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cadence                                                                     */
/* -------------------------------------------------------------------------- */

const CADENCE_CHANNELS = ["Email", "SMS", "WhatsApp", "Push", "In-app", "RCS", "Web push", "Direct mail", "Call centre"];

const blank = (channel = "Email"): CadenceRow => ({ channel, purpose: "", frequency: "Weekly", days: [], time: "", mode: "Scheduled" });

export function CadenceInput({
  value,
  onChange,
  disabled,
  channels,
  purposeHint,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  channels: string[];
  purposeHint?: string;
}) {
  const [rows, setRows] = useState<CadenceRow[]>(() => {
    const parsed = value.map(parseCadenceRow).filter((r): r is CadenceRow => !!r);
    return parsed.length ? parsed : [blank(channels[0])];
  });
  const options = useMemo(() => [...new Set([...channels.filter((c) => !/paid|display|sales|website/i.test(c)), ...CADENCE_CHANNELS])], [channels]);
  const emit = (next: CadenceRow[]) => {
    setRows(next);
    onChange(next.filter((r) => r.channel).map(formatCadenceRow));
  };
  // Report the initial rows so a pre-filled calendar can be saved as is.
  const first = useRef(true);
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    onChange(rows.filter((r) => r.channel).map(formatCadenceRow));
  }, [rows, onChange]);

  const set = (i: number, patch: Partial<CadenceRow>) => emit(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const analysis = useMemo(() => analyzeCadence(rows.map(formatCadenceRow)), [rows]);
  const maxDay = Math.max(1, ...DAYS.map((d) => analysis.byDay[d]));

  return (
    <div className="space-y-3" data-rich-input>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const triggered = r.mode === "Triggered";
          return (
            <div key={i} className="rounded-xl border border-line bg-white p-3 shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
              <div className="flex items-center gap-2">
                <Select value={r.channel} onChange={(e) => set(i, { channel: e.target.value })} disabled={disabled} aria-label={`Channel for message ${i + 1}`} className="h-9 w-32! shrink-0">
                  {options.map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Input value={r.purpose} onChange={(e) => set(i, { purpose: e.target.value.replace(/\|/g, "/") })} maxLength={80} placeholder={purposeHint ?? "What is it? e.g. Weekly offers newsletter"} disabled={disabled} aria-label={`Purpose of message ${i + 1}`} className="h-9 min-w-0 flex-1" />
                {rows.length > 1 && (
                  <button type="button" onClick={() => emit(rows.filter((_, j) => j !== i))} disabled={disabled} className="shrink-0 rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-red-600" aria-label={`Remove message ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label="Scheduled or triggered">
                  {(["Scheduled", "Triggered"] as const).map((m) => (
                    <button key={m} type="button" disabled={disabled} onClick={() => set(i, { mode: m, ...(m === "Triggered" ? { frequency: "When triggered by an event" as CadenceFrequency } : r.frequency === "When triggered by an event" ? { frequency: "Weekly" as CadenceFrequency } : {}) })}
                      className={cn("flex items-center gap-1 rounded-md px-2 py-1 font-medium transition", r.mode === m ? "bg-brand-600 text-white" : "text-muted hover:text-ink")}>
                      {m === "Triggered" ? <Zap className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{m}
                    </button>
                  ))}
                </div>
                <Select value={r.frequency} onChange={(e) => set(i, { frequency: e.target.value as CadenceFrequency })} disabled={disabled} aria-label={`How often message ${i + 1} is sent`} className="h-9 w-auto!">
                  {CADENCE_FREQUENCIES.filter((f) => (triggered ? f === "When triggered by an event" || f === "One-off" || f === "Daily" || f === "Weekly" : f !== "When triggered by an event")).map((f) => <option key={f}>{f}</option>)}
                </Select>
                {!triggered && (
                  <div className="flex flex-wrap gap-1" role="group" aria-label={`Send days for message ${i + 1}`}>
                    {DAYS.map((d) => {
                      const on = r.days.includes(d);
                      return (
                        <button key={d} type="button" disabled={disabled} aria-pressed={on}
                          onClick={() => set(i, { days: on ? r.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || r.days.includes(x)) })}
                          className={cn("h-8 w-10 rounded-lg border text-xs font-medium transition", on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-muted hover:border-line-strong")}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  {triggered ? "Sent after the event at" : "at"}
                  <Input type="time" value={r.time} onChange={(e) => set(i, { time: e.target.value })} disabled={disabled} className="h-9 w-[7.5rem]!" aria-label={`Send time for message ${i + 1}`} />
                </label>
                {triggered && <span className="text-xs text-subtle">Leave the time empty if it goes out immediately.</span>}
              </div>
            </div>
          );
        })}
      </div>
      {rows.length < 25 && (
        <button type="button" onClick={() => emit([...rows, blank(rows.at(-1)?.channel ?? channels[0])])} disabled={disabled} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          <Plus className="h-3.5 w-3.5" /> Add a message
        </button>
      )}

      {analysis.rows.length > 0 && (
        <div className="rounded-xl bg-canvas px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-ink">≈ {analysis.perWeek} scheduled sends a week{analysis.triggered ? ` + ${analysis.triggered} triggered` : ""}</span>
            <span className="text-subtle">for a customer on every list</span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1" aria-label="Sends per weekday">
            {DAYS.map((d: Day) => (
              <div key={d} className="text-center">
                <div className="flex h-10 items-end justify-center rounded-md bg-white">
                  <div className="w-full rounded-md bg-gradient-to-t from-brand-600 to-violet-500" style={{ height: `${(analysis.byDay[d] / maxDay) * 100}%`, minHeight: analysis.byDay[d] ? 3 : 0 }} />
                </div>
                <div className="mt-0.5 text-[10px] text-subtle">{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RichInputHint({ input }: { input: string }) {
  if (input === "links") return <span className="text-xs text-muted">Up to 5 links</span>;
  if (input === "images") return <span className="text-xs text-muted">Up to 6 images</span>;
  if (input === "cadence") return <span className="text-xs text-muted">One row per message</span>;
  return null;
}
