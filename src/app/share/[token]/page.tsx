"use client";

import { use, useEffect, useState } from "react";
import { Compass, Lock } from "lucide-react";
import type { ReportModel } from "@/reports/model";
import { BlockView } from "@/components/case/ReportView";
import { Spinner } from "@/components/ui";
import { product } from "@/config/product";

/** Read-only report for stakeholders with a share link (no sign-in). */
export default function SharedReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [model, setModel] = useState<ReportModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/share/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json()) as { model?: ReportModel; error?: string };
        if (!r.ok || !body.model) throw new Error(body.error ?? "This link is invalid or has been revoked.");
        setModel(body.model);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <main className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-2 font-semibold text-ink"><Compass className="h-4 w-4 text-brand-600" />{product.name}</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Shared read-only report</span>
        </div>
        {error ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center"><p className="font-semibold">Report unavailable</p><p className="mt-1 text-sm text-muted">{error}</p></div>
        ) : !model ? (
          <Spinner label="Loading report…" />
        ) : (
          <article className="rounded-2xl border border-line bg-white px-6 py-10 shadow-card sm:px-10" style={{ fontFamily: model.brand.fontFamily }}>
            <header className="mb-8 border-b border-line pb-6">
              {model.brand.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL from brand settings
                <img src={model.brand.logoDataUrl} alt={`${model.companyName || "Company"} logo`} className="mb-5 max-h-12 max-w-[220px] object-contain" />
              )}
              <div className="h-1 w-16 rounded" style={{ background: model.brand.accentColor }} />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: model.brand.primaryColor, fontFamily: model.brand.headingFont || model.brand.fontFamily }}>{model.title}</h1>
              <p className="mt-1 text-muted">{model.subtitle}{model.companyName ? ` · ${model.companyName}` : ""} · {model.generatedAt.slice(0, 10)}</p>
            </header>
            <div className="space-y-10">
              {model.sections.map((s) => (
                <section key={s.id}>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ color: model.brand.primaryColor }}>{s.title}</h2>
                  <div className="mt-3 space-y-4">{s.blocks.map((b, i) => <BlockView key={i} b={b} />)}</div>
                </section>
              ))}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
