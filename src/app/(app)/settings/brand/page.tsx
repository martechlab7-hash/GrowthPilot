"use client";

import { useState } from "react";
import { DEFAULT_BRAND, type BrandProfile } from "@/domain/types";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, Label, PageHeader, Select, Spinner } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";

export default function BrandPage() {
  const { me } = useAuth();
  const canManage = me?.onboarded && ["owner", "admin"].includes(me.profile.role);
  const { data, loading } = useApi<{ brand: BrandProfile }>("/api/brand");
  if (loading) return <Spinner />;
  return <BrandForm initial={data?.brand ?? DEFAULT_BRAND} canManage={!!canManage} />;
}

function BrandForm({ initial, canManage }: { initial: BrandProfile; canManage: boolean }) {
  const [brand, setBrand] = useState<BrandProfile>(initial);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const color = (k: "primaryColor" | "secondaryColor" | "accentColor", label: string) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <div className="flex gap-2">
        <input type="color" aria-label={label} value={brand[k]} disabled={!canManage} onChange={(e) => setBrand({ ...brand, [k]: e.target.value })} className="h-10 w-12 cursor-pointer rounded border border-line" />
        <Input id={k} value={brand[k]} disabled={!canManage} onChange={(e) => setBrand({ ...brand, [k]: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Brand guidelines" description="Applied to PDF, Word and PowerPoint exports when you choose “Use saved brand”." />
      <Card>
        <CardHeader title="Brand configuration" />
        <CardBody>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setErr(null);
            try { await apiFetch("/api/brand", { method: "PUT", body: brand }); setSaved("Saved"); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
          }}>
            <div><Label htmlFor="company">Company name</Label><Input id="company" value={brand.companyName} disabled={!canManage} onChange={(e) => setBrand({ ...brand, companyName: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-3">{color("primaryColor", "Primary color")}{color("secondaryColor", "Secondary color")}{color("accentColor", "Accent color")}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="font">Font (Word/PowerPoint)</Label><Select id="font" value={brand.fontFamily} disabled={!canManage} onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })}>{["Calibri", "Arial", "Helvetica", "Georgia", "Segoe UI", "Aptos"].map((f) => <option key={f}>{f}</option>)}</Select></div>
              <div><Label htmlFor="style">Visual style</Label><Select id="style" value={brand.visualStyle} disabled={!canManage} onChange={(e) => setBrand({ ...brand, visualStyle: e.target.value as BrandProfile["visualStyle"] })}><option value="consulting">Consulting</option><option value="minimal">Minimal</option><option value="bold">Bold</option></Select></div>
            </div>
            <div className="rounded-lg border border-line p-4">
              <div className="h-1 w-12 rounded" style={{ background: brand.accentColor }} />
              <div className="mt-2 text-lg font-semibold" style={{ color: brand.primaryColor, fontFamily: brand.fontFamily }}>Preview headline</div>
              <div className="text-sm" style={{ color: brand.secondaryColor }}>{brand.companyName || "Your company"} · Strategy report</div>
            </div>
            <p className="text-xs text-muted">Logo, brand-guideline PDF and PowerPoint template uploads are on the Phase 2 roadmap (Firebase Storage).</p>
            <ErrorNote error={err} />
            {canManage && <div className="flex items-center justify-end gap-3"><span className="text-sm text-muted">{saved}</span><Button type="submit" loading={busy}>Save brand</Button></div>}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
