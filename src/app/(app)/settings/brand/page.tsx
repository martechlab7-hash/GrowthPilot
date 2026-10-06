"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { DEFAULT_BRAND, type BrandProfile } from "@/domain/types";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, Label, Select, Spinner } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";
import { cn } from "@/lib/cn";

const FONTS = ["Calibri", "Aptos", "Arial", "Helvetica", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Segoe UI", "Georgia", "Times New Roman", "Garamond", "Merriweather", "Playfair Display"];
const PRESETS: { name: string; primary: string; secondary: string; accent: string }[] = [
  { name: "Consulting navy", primary: "#0F2A4A", secondary: "#2F6FDE", accent: "#E8A33D" },
  { name: "Indigo", primary: "#312E81", secondary: "#6366F1", accent: "#F59E0B" },
  { name: "Forest", primary: "#14532D", secondary: "#16A34A", accent: "#EAB308" },
  { name: "Graphite", primary: "#111827", secondary: "#4B5563", accent: "#EF4444" },
  { name: "Plum", primary: "#4A044E", secondary: "#A21CAF", accent: "#F97316" },
];
const MAX_LOGO_PX = 600;

/** Read any image the browser can display and re-encode it as a size-capped PNG. */
async function toPng(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (file.size > 5_000_000) throw new Error("Logo file is too large (max 5 MB).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("This file couldn't be read as an image. Use PNG, JPG, SVG or WebP."));
      i.src = url;
    });
    const w0 = img.naturalWidth || 400;
    const h0 = img.naturalHeight || 160;
    const scale = Math.min(1, MAX_LOGO_PX / Math.max(w0, h0));
    const width = Math.max(1, Math.round(w0 * scale));
    const height = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > 470_000) throw new Error("Logo is too detailed after resizing — try a simpler PNG or SVG.");
    return { dataUrl, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BrandPage() {
  const { me } = useAuth();
  const canManage = !!me?.onboarded && ["owner", "admin"].includes(me.profile.role);
  const { data, loading } = useApi<{ brand: BrandProfile }>("/api/brand");
  if (loading) return <Spinner />;
  return <BrandForm initial={{ ...DEFAULT_BRAND, ...(data?.brand ?? {}) }} canManage={canManage} />;
}

function BrandForm({ initial, canManage }: { initial: BrandProfile; canManage: boolean }) {
  const [brand, setBrand] = useState<BrandProfile>(initial);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<BrandProfile>) => {
    setBrand((b) => ({ ...b, ...patch }));
    setSaved(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    try {
      const { dataUrl, width, height } = await toPng(file);
      set({ logoDataUrl: dataUrl, logoWidth: width, logoHeight: height });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const color = (k: "primaryColor" | "secondaryColor" | "accentColor", label: string) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <div className="flex gap-2">
        <input type="color" aria-label={label} value={brand[k]} disabled={!canManage} onChange={(e) => set({ [k]: e.target.value.toUpperCase() })} className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-line-strong bg-white p-1" />
        <Input id={k} value={brand[k]} disabled={!canManage} onChange={(e) => set({ [k]: e.target.value })} className="font-mono" />
      </div>
    </div>
  );

  const headingFont = brand.headingFont || brand.fontFamily;

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await apiFetch("/api/brand", { method: "PUT", body: brand });
          setSaved("Brand saved — new exports will use it.");
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader title="Logo" description="Shown on report covers and page headers in PDF, Word and PowerPoint. PNG, JPG, SVG or WebP." />
          <CardBody>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (canManage) void onFile(e.dataTransfer.files[0]); }}
              className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition", dragging ? "border-brand-500 bg-brand-50" : "border-line-strong bg-canvas/60")}
            >
              {brand.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoDataUrl} alt="Brand logo" className="max-h-24 max-w-[260px] object-contain" />
              ) : (
                <ImagePlus className="h-8 w-8 text-subtle" />
              )}
              {canManage && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> {brand.logoDataUrl ? "Replace" : "Upload logo"}</Button>
                  {brand.logoDataUrl && <Button type="button" variant="ghost" size="sm" onClick={() => set({ logoDataUrl: undefined, logoWidth: undefined, logoHeight: undefined })}><Trash2 className="h-4 w-4" /> Remove</Button>}
                </div>
              )}
              <p className="text-xs text-muted">Drag and drop, or upload. Resized to {MAX_LOGO_PX}px and stored as PNG.</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Identity" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="company">Company name</Label><Input id="company" value={brand.companyName} disabled={!canManage} onChange={(e) => set({ companyName: e.target.value })} /></div>
            <div><Label htmlFor="tagline" hint="(optional)">Tagline</Label><Input id="tagline" value={brand.tagline ?? ""} maxLength={160} disabled={!canManage} onChange={(e) => set({ tagline: e.target.value || undefined })} placeholder="e.g. Strategy that ships" /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Colours" />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.name} type="button" disabled={!canManage} onClick={() => set({ primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent })} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs hover:border-line-strong">
                  <span className="flex -space-x-1">{[p.primary, p.secondary, p.accent].map((c) => <span key={c} className="h-4 w-4 rounded-full ring-2 ring-white" style={{ background: c }} />)}</span>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">{color("primaryColor", "Primary")}{color("secondaryColor", "Secondary")}{color("accentColor", "Accent")}</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Typography" description="Word and PowerPoint use these fonts when installed on the viewer's computer. PDFs use the closest built-in family (serif or sans)." />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <FontPicker id="heading-font" label="Heading font" value={headingFont} disabled={!canManage} onChange={(v) => set({ headingFont: v })} />
            <FontPicker id="body-font" label="Body font" value={brand.fontFamily} disabled={!canManage} onChange={(v) => set({ fontFamily: v })} />
            <div>
              <Label htmlFor="style">Visual style</Label>
              <Select id="style" value={brand.visualStyle} disabled={!canManage} onChange={(e) => set({ visualStyle: e.target.value as BrandProfile["visualStyle"] })}>
                <option value="consulting">Consulting</option><option value="minimal">Minimal</option><option value="bold">Bold</option>
              </Select>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Report cover preview</div>
        <div className="aspect-[16/9] overflow-hidden rounded-2xl shadow-pop ring-1 ring-black/5" style={{ background: brand.primaryColor }}>
          <div className="flex h-full flex-col justify-between p-5 text-white">
            <div>
              {brand.logoDataUrl && (
                <span className="inline-block rounded-md bg-white px-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                  <img src={brand.logoDataUrl} alt="" className="h-6 max-w-[120px] object-contain" />
                </span>
              )}
            </div>
            <div>
              <div className="mb-2 h-1 w-10 rounded" style={{ background: brand.accentColor }} />
              <div className="text-lg font-bold leading-tight" style={{ fontFamily: headingFont }}>Improve Customer Retention</div>
              {brand.tagline && <div className="mt-1 text-xs italic opacity-80" style={{ fontFamily: brand.fontFamily }}>{brand.tagline}</div>}
              <div className="mt-1 text-xs opacity-80" style={{ fontFamily: brand.fontFamily }}>Airlines · Marketing Strategy & Diagnostic</div>
            </div>
            <div className="text-[10px] opacity-70" style={{ fontFamily: brand.fontFamily }}>{brand.companyName || "Your company"}</div>
          </div>
        </div>
        <Card className="p-4">
          <div className="text-sm font-semibold" style={{ color: brand.primaryColor, fontFamily: headingFont }}>Key findings</div>
          <p className="mt-1 text-xs text-slate-600" style={{ fontFamily: brand.fontFamily }}>Retention decline is concentrated among high-value customers after their second purchase.</p>
          <div className="mt-2 overflow-hidden rounded-md text-[10px]">
            <div className="px-2 py-1 font-semibold text-white" style={{ background: brand.primaryColor }}>Priority · Recommendation</div>
            <div className="border-x border-b border-line px-2 py-1">P0 · Predictive churn intervention</div>
          </div>
        </Card>
        <ErrorNote error={err} />
        {saved && <p className="text-sm text-emerald-700">{saved}</p>}
        {canManage && <Button type="submit" className="w-full" loading={busy}>Save brand</Button>}
      </div>
    </form>
  );
}

function FontPicker({ id, label, value, onChange, disabled }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const custom = !FONTS.includes(value);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={custom ? "__custom" : value} disabled={disabled} onChange={(e) => onChange(e.target.value === "__custom" ? "" : e.target.value)} style={{ fontFamily: custom ? undefined : value }}>
        {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        <option value="__custom">Custom…</option>
      </Select>
      {custom && <Input className="mt-2" value={value} maxLength={60} disabled={disabled} placeholder="Font name, e.g. Proxima Nova" onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
