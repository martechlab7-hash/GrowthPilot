"use client";

import { useState } from "react";
import type { Stage } from "@/domain/types";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, KindBadge, Label, Select } from "@/components/ui";
import { MaturityBars } from "@/components/charts";
import { formatValue, humanizeKey } from "@/engine/context";
import type { CaseTabProps } from "./Workspace";
import { DataShare } from "./DataShare";
import { CommsReview } from "./CommsReview";

const STAGE_MAP: Record<"business" | "customer" | "data" | "technology", { title: string; stages: Stage[]; prefix: string }> = {
  business: { title: "Business & Performance", stages: ["business", "diagnosis", "economics"], prefix: "business" },
  customer: { title: "Customer", stages: ["customer"], prefix: "customer" },
  data: { title: "Data & Insights", stages: ["data", "measurement"], prefix: "data" },
  technology: { title: "Technology & Marketing", stages: ["technology", "activation"], prefix: "technology" },
};

/** Case context, with every value labelled fact / inference / assumption. */
export function ContextView({ view, ctl, canContribute, canManage, go, stage }: CaseTabProps & { stage: keyof typeof STAGE_MAP }) {
  const cfg = STAGE_MAP[stage];
  const fields = Object.values(view.case.context.fields).filter((f) => cfg.stages.includes(f.stage)).sort((a, b) => a.key.localeCompare(b.key));
  const unknown = view.case.context.unknownKeys.filter((k) => cfg.stages.some((s) => k.startsWith(s === "diagnosis" ? "performance" : s === "activation" ? "marketing" : s)));
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<"fact" | "assumption">("fact");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {stage === "data" && <DataShare view={view} ctl={ctl} canContribute={canContribute} canManage={false} go={() => {}} />}
      {stage === "data" && <CommsReview view={view} ctl={ctl} canContribute={canContribute} canManage={canManage} go={go} />}
      <Card>
        <CardHeader title={cfg.title} description="Everything the AI knows about this area. Facts come from you; inferences and assumptions are labelled." />
        <CardBody>
          {fields.length === 0 ? (
            <p className="text-sm text-muted">Nothing captured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="pb-2 font-medium">Item</th><th className="pb-2 font-medium">Value</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Source</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fields.map((f) => (
                  <tr key={f.key} className="align-top">
                    <td className="py-2 pr-4 font-medium">{humanizeKey(f.key)}</td>
                    <td className="py-2 pr-4 [overflow-wrap:anywhere]">{f.key === "marketing.comm_screenshots" && Array.isArray(f.value) ? `${f.value.length} screenshot(s), reviewed on the Data tab` : Array.isArray(f.value) && f.key === "marketing.cadence" ? f.value.join("; ") : formatValue(f.value)}{f.note && <div className="text-xs text-muted">Note: {f.note}</div>}</td>
                    <td className="py-2 pr-4"><KindBadge kind={f.kind} /></td>
                    <td className="py-2 text-xs text-muted">{f.source.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {unknown.length > 0 && <p className="mt-4 text-xs text-muted">Marked as unknown: {unknown.map(humanizeKey).join(", ")}</p>}
        </CardBody>
      </Card>

      {stage === "technology" && (
        <Card>
          <CardHeader title={`MarTech maturity: Level ${view.derived.maturity.level} — ${view.derived.maturity.levelName}`} description={`Computed from ${view.derived.maturity.basedOnFields} answered inputs. Unanswered inputs score 0.`} />
          <CardBody>
            <MaturityBars dimensions={view.derived.maturity.dimensions} />
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2">Capability</th><th className="pb-2">Current</th><th className="pb-2">Gap</th></tr></thead>
              <tbody className="divide-y divide-line">
                {view.derived.maturity.capabilityGaps.map((g) => <tr key={g.capability}><td className="py-2 pr-3 font-medium">{g.capability}</td><td className="py-2 pr-3">{g.current}</td><td className="py-2">{g.gap || "—"}</td></tr>)}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {canContribute && (
        <Card>
          <CardHeader title="Add information" description="Add a fact you know, or record an assumption explicitly." />
          <CardBody>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
                if (!slug) return setErr("Give the item a name");
                setErr(null);
                if (await ctl.run("Saving", "/context", { body: { key: `${cfg.prefix}.${slug}`, value, kind } })) {
                  setLabel(""); setValue("");
                }
              }}
            >
              <div><Label htmlFor="ctx-label">Item</Label><Input id="ctx-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. NPS trend" /></div>
              <div><Label htmlFor="ctx-value">Value</Label><Input id="ctx-value" required value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Down 8 points YoY" /></div>
              <div><Label htmlFor="ctx-kind">Type</Label><Select id="ctx-kind" value={kind} onChange={(e) => setKind(e.target.value as "fact" | "assumption")}><option value="fact">Fact</option><option value="assumption">Assumption</option></Select></div>
              <Button type="submit" loading={ctl.busy === "Saving"}>Add</Button>
            </form>
            <ErrorNote error={err} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
