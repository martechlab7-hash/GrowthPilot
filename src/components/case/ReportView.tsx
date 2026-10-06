"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Map as MapIcon } from "lucide-react";
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, Select, Spinner } from "@/components/ui";
import { apiDownload, apiFetch } from "@/lib/client/api";
import type { Block, ReportModel } from "@/reports/model";
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
  }
}

export function ReportView({ view, ctl, canManage }: CaseTabProps) {
  const c = view.case;
  const [model, setModel] = useState<ReportModel | null>(null);
  const [brand, setBrand] = useState<"saved" | "default">("saved");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ model: ReportModel }>(`/api/cases/${c.id}/report`).then((r) => setModel(r.model)).catch((e: Error) => setErr(e.message));
  }, [c.id, c.revision]);

  const download = async (format: string) => {
    setDownloading(format);
    setErr(null);
    try {
      await apiDownload(`/api/cases/${c.id}/report/export?format=${format}&brand=${brand}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDownloading(null);
    }
  };

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
          <div className="w-64">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="brand">Would you like to apply your brand guidelines?</label>
            <Select id="brand" value={brand} onChange={(e) => setBrand(e.target.value as "saved" | "default")}>
              <option value="saved">Use saved brand</option>
              <option value="default">Use default consulting style</option>
            </Select>
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

      {!model ? (
        <Spinner label="Building report…" />
      ) : (
        <article className="rounded-2xl border border-line bg-white px-6 py-10 shadow-card sm:px-10" style={{ fontFamily: model.brand.fontFamily }}>
          <header className="mb-8 border-b border-line pb-6">
            {model.brand.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from brand settings
              <img src={model.brand.logoDataUrl} alt={`${model.companyName || "Company"} logo`} className="mb-5 max-h-12 max-w-[220px] object-contain" />
            )}
            <div className="h-1 w-16 rounded" style={{ background: model.brand.accentColor }} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: model.brand.primaryColor, fontFamily: model.brand.headingFont || model.brand.fontFamily }}>{model.title}</h1>
            {model.brand.tagline && <p className="mt-1 text-sm italic text-muted">{model.brand.tagline}</p>}
            <p className="mt-1 text-muted">{model.subtitle}{model.companyName ? ` · ${model.companyName}` : ""} · {model.generatedAt.slice(0, 10)}</p>
          </header>
          <div className="space-y-10">
            {model.sections.map((s) => (
              <section key={s.id} className="space-y-3">
                <h2 className="text-lg font-semibold" style={{ color: model.brand.primaryColor, fontFamily: model.brand.headingFont || model.brand.fontFamily }}>{s.title}</h2>
                {s.blocks.map((b, i) => <BlockView key={i} b={b} />)}
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
