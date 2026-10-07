"use client";

import { Flowchart } from "@/components/charts/Flowchart";
import { useEffect, useState } from "react";
import { Download, FileText, Link2, Map as MapIcon } from "lucide-react";
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, Select, Spinner } from "@/components/ui";
import Link from "next/link";
import { apiDownload, apiFetch } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";
import type { Brand } from "@/domain/types";
import { AUDIENCES, forAudience, type Audience, type Block, type ReportModel } from "@/reports/model";
import type { CaseTabProps } from "./Workspace";

export function RoadmapView({ view, ctl, canManage, go }: CaseTabProps) {
  const r = view.case.report;
  if (!r) {
    return (
      <EmptyState icon={<MapIcon className="h-8 w-8" />} title="Roadmap is produced with the report"
        description="The Report Agent sequences recommendations into 0–30 day quick wins through 6–12 month predictive capabilities."
        action={view.case.recommendations.length ? canManage && <Button loading={ctl.busy === "Writing report"} onClick={() => ctl.run("Writing report", "/report")}>Generate report & roadmap</Button> : <Button onClick={() => go("recommendations")}>Go to recommendations</Button>} />
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-5">
        {r.roadmap.map((h) => (
          <Card key={h.horizon}>
            <CardBody>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{h.horizon}</div>
              <div className="mt-1 font-semibold">{h.theme}</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{h.initiatives.map((i) => <li key={i}>{i}</li>)}</ul>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Risks & mitigations" />
        <CardBody>
          <table className="w-full text-sm"><tbody className="divide-y divide-line">{r.risks.map((x) => <tr key={x.risk} className="align-top"><td className="py-2 pr-4 font-medium">{x.risk}</td><td className="py-2">{x.mitigation}</td></tr>)}</tbody></table>
        </CardBody>
      </Card>
    </div>
  );
}

export function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "paragraph":
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.text}</p>;
    case "bullets":
      return <ul className="list-disc space-y-1 pl-5 text-sm">{b.items.map((i, k) => <li key={k}>{i}</li>)}</ul>;
    case "callout":
      return (
        <div className="rounded-r-lg border-l-4 border-accent bg-canvas px-4 py-3 text-sm">
          <div className="font-semibold text-brand">{b.label}</div>
          <div className="mt-1 whitespace-pre-wrap">{b.text}</div>
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{b.headers.map((h) => <th key={h} className="bg-brand px-3 py-2 text-left text-xs font-semibold text-white">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{b.rows.map((r, i) => <tr key={i} className="align-top">{r.map((v, j) => <td key={j} className="whitespace-pre-wrap px-3 py-2">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "flow":
      return <div className="overflow-x-auto rounded-xl border border-line bg-canvas/50 p-4"><Flowchart steps={b.steps} /></div>;
  }
}

export function ReportView({ view, ctl, canManage }: CaseTabProps) {
  const c = view.case;
  const [model, setModel] = useState<ReportModel | null>(null);
  const { data: brandList } = useApi<{ brands: Brand[] }>("/api/brands");
  const brands = brandList?.brands ?? [];
  // A saved brand id, or "default" for the plain product style.
  const [brand, setBrand] = useState<string>(c.brandId ?? "saved");
  const caseBrand = brands.find((b) => b.id === c.brandId) ?? brands.find((b) => b.isDefault);
  const brandValue = brand === "saved" || (brand !== "default" && !brands.some((b) => b.id === brand)) ? caseBrand?.id ?? (brands.length ? "default" : "saved") : brand;
  const [audience, setAudience] = useState<Audience>("full");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ model: ReportModel }>(`/api/cases/${c.id}/report${brand === "saved" ? "" : `?brand=${encodeURIComponent(brand)}`}`).then((r) => setModel(r.model)).catch((e: Error) => setErr(e.message));
  }, [c.id, c.revision, brand]);

  const pickBrand = async (value: string) => {
    setBrand(value);
    if (value === "saved") return;
    // Remember a saved brand on the case so share links and teammates use it too.
    if (canManage && value !== "default" && value !== c.brandId) await ctl.run("Saving brand", "", { method: "PATCH", body: { brandId: value } });
  };

  const download = async (format: string) => {
    setDownloading(format);
    setErr(null);
    try {
      await apiDownload(`/api/cases/${c.id}/report/export?format=${format}&brand=${encodeURIComponent(brandValue)}&audience=${audience}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDownloading(null);
    }
  };

  const shown = model ? forAudience(model, audience) : null;

  if (!c.recommendations.length) {
    return <EmptyState icon={<FileText className="h-8 w-8" />} title="The report comes last" description="Complete discovery, validate hypotheses and build recommendations first. A report is never produced from unvalidated hypotheses." />;
  }

  return (
    <div className="space-y-5">
      <Card className="no-print">
        <CardHeader
          title={c.report ? "Your strategy is ready." : "Generate the strategy report"}
          description={c.report ? `Narrative generated ${new Date(c.report.generatedAt).toLocaleString()}.` : "The Report Agent writes the executive narrative, roadmap and risks from your validated analysis."}
          action={canManage && <Button variant={c.report ? "outline" : "primary"} loading={ctl.busy === "Writing report"} onClick={() => ctl.run("Writing report", "/report")}>{c.report ? "Regenerate narrative" : "Generate report"}</Button>}
        />
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="w-60">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="audience">Who is it for?</label>
            <Select id="audience" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {(Object.entries(AUDIENCES) as [Audience, (typeof AUDIENCES)[Audience]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <div className="w-64">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="brand">Brand</label>
            <Select id="brand" value={brandValue} onChange={(e) => void pickBrand(e.target.value)}>
              {brands.length === 0 && <option value="saved">Saved brand settings</option>}
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isDefault ? " (default)" : ""}</option>)}
              <option value="default">No brand: default consulting style</option>
            </Select>
            {brands.length === 0 && <p className="mt-1 text-xs text-muted">Add brands in <Link href="/settings/brand" className="text-brand-600 hover:underline">Settings → Brand</Link>.</p>}
          </div>
          <Button variant="outline" onClick={() => window.print()} title="Uses your browser's print dialog — choose “Save as PDF”">
            <Download className="h-4 w-4" /> Print / Save as PDF
          </Button>
          {(["pdf", "docx", "pptx", "md"] as const).map((f) => (
            <Button key={f} variant="outline" loading={downloading === f} onClick={() => download(f)}>
              <Download className="h-4 w-4" /> {{ pdf: "PDF", docx: "Word", pptx: "PowerPoint", md: "Markdown" }[f]}
            </Button>
          ))}
          <ErrorNote error={err} />
        </CardBody>
      </Card>

      {canManage && <ShareLink c={c} ctl={ctl} audience={audience} />}

      {!shown ? (
        <Spinner label="Building report…" />
      ) : (
        <article className="rounded-2xl border border-line bg-white px-6 py-10 shadow-card sm:px-10" style={{ fontFamily: shown.brand.fontFamily }}>
          <header className="mb-8 border-b border-line pb-6">
            {shown.brand.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from brand settings
              <img src={shown.brand.logoDataUrl} alt={`${shown.companyName || "Company"} logo`} className="mb-5 max-h-12 max-w-[220px] object-contain" />
            )}
            <div className="h-1 w-16 rounded" style={{ background: shown.brand.accentColor }} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: shown.brand.primaryColor, fontFamily: shown.brand.headingFont || shown.brand.fontFamily }}>{shown.title}</h1>
            {shown.brand.tagline && <p className="mt-1 text-sm italic text-muted">{shown.brand.tagline}</p>}
            <p className="mt-1 text-muted">{shown.subtitle}{shown.companyName ? ` · ${shown.companyName}` : ""} · {shown.generatedAt.slice(0, 10)}</p>
          </header>
          <div className="space-y-10">
            {shown.sections.map((s) => (
              <section key={s.id} className="space-y-3">
                <h2 className="text-lg font-semibold" style={{ color: shown.brand.primaryColor, fontFamily: shown.brand.headingFont || shown.brand.fontFamily }}>{s.title}</h2>
                {s.blocks.map((b, i) => <BlockView key={i} b={b} />)}
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}

/** Read-only link for stakeholders without an account; rotate or revoke at any time. */
function ShareLink({ c, ctl, audience }: { c: CaseTabProps["view"]["case"]; ctl: CaseTabProps["ctl"]; audience: Audience }) {
  const [copied, setCopied] = useState(false);
  const url = c.shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/${c.shareToken}` : null;
  return (
    <Card className="no-print">
      <CardBody className="flex flex-wrap items-center gap-3 text-sm">
        <Link2 className="h-4 w-4 text-brand-600" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Share a read-only link</div>
          {url ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-canvas px-2 py-1 text-xs">{url}</code>
              <span className="text-xs text-muted">Shows the {AUDIENCES[(c.share?.audience as Audience) ?? "executive"]?.label ?? "report"}. Anyone with the link can view it; no sign-in.</span>
            </div>
          ) : (
            <p className="text-muted">Stakeholders without an account can view the {AUDIENCES[audience].label.toLowerCase()} (chosen above). Revoke the link at any time.</p>
          )}
        </div>
        {url ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copied" : "Copy link"}</Button>
            <Button size="sm" variant="outline" loading={ctl.busy === "Sharing"} onClick={() => ctl.run("Sharing", "/share", { body: { audience } })}>New link</Button>
            <Button size="sm" variant="ghost" loading={ctl.busy === "Revoking"} onClick={() => ctl.run("Revoking", "/share", { method: "DELETE" })}>Revoke</Button>
          </div>
        ) : (
          <Button size="sm" loading={ctl.busy === "Sharing"} onClick={() => ctl.run("Sharing", "/share", { body: { audience } })}>Create link</Button>
        )}
      </CardBody>
    </Card>
  );
}
