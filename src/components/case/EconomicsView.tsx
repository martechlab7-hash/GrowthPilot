"use client";

import { useEffect, useState } from "react";
import type { EconomicsInputs, KnowledgeKind } from "@/domain/types";
import { Button, Card, CardBody, CardHeader, Input, KindBadge, Label, Spinner } from "@/components/ui";
import { ScenarioChart } from "@/components/charts";
import { apiFetch } from "@/lib/client/api";
import { money } from "@/reports/model";
import type { CaseTabProps } from "./Workspace";

type Defaults = { defaults: { inputs: EconomicsInputs; provenance: Record<string, KnowledgeKind> } };

export function EconomicsView({ view, ctl, canContribute }: CaseTabProps) {
  const c = view.case;
  const [inputs, setInputs] = useState<EconomicsInputs | null>(c.economics?.inputs ?? null);
  const [prov, setProv] = useState<Record<string, KnowledgeKind>>(c.economics?.inputProvenance ?? {});

  useEffect(() => {
    if (inputs) return;
    apiFetch<Defaults>(`/api/cases/${c.id}/economics`).then((d) => {
      setInputs(d.defaults.inputs);
      setProv(d.defaults.provenance);
    }).catch(() => {});
  }, [c.id, inputs]);

  if (!inputs) return <Spinner label="Loading economics…" />;
  const set = (k: keyof EconomicsInputs, v: number) => setInputs({ ...inputs, [k]: v });
  const setLift = (k: keyof EconomicsInputs["scenarioLifts"], v: number) => setInputs({ ...inputs, scenarioLifts: { ...inputs.scenarioLifts, [k]: v } });
  const e = c.economics;

  const field = (k: "eligibleCustomers" | "averageAnnualValue" | "grossMarginPct" | "investment" | "monthlyRunCost", label: string, hint?: string) => (
    <div>
      <Label htmlFor={k} hint={hint}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={k} type="number" min={0} step="any" value={inputs[k]} disabled={!canContribute} onChange={(ev) => set(k, Number(ev.target.value))} />
        <KindBadge kind={prov[k] ?? "assumption"} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Business case inputs" description="Values from your answers are facts; anything you type here that differs is treated as an assumption." />
        <CardBody>
          <form
            className="space-y-5"
            onSubmit={async (ev) => {
              ev.preventDefault();
              await ctl.run("Calculating", "/economics", { method: "PUT", body: inputs });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {field("eligibleCustomers", "Eligible customers")}
              {field("averageAnnualValue", "Average annual value", `(${inputs.currency})`)}
              {field("grossMarginPct", "Gross margin", "(%)")}
              {field("investment", "One-off investment", `(${inputs.currency})`)}
              {field("monthlyRunCost", "Monthly run cost", `(${inputs.currency})`)}
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" maxLength={3} value={inputs.currency} disabled={!canContribute} onChange={(ev) => setInputs({ ...inputs, currency: ev.target.value.toUpperCase() })} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">Scenario lift on eligible customers <KindBadge kind="assumption" /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["conservative", "base", "aggressive"] as const).map((k) => (
                  <div key={k}><Label htmlFor={k} hint="(%)">{k.charAt(0).toUpperCase() + k.slice(1)}</Label><Input id={k} type="number" min={0} max={100} step="any" value={inputs.scenarioLifts[k]} disabled={!canContribute} onChange={(ev) => setLift(k, Number(ev.target.value))} /></div>
                ))}
              </div>
            </div>
            {canContribute && <div className="flex justify-end"><Button type="submit" loading={ctl.busy === "Calculating"}>Calculate</Button></div>}
          </form>
        </CardBody>
      </Card>

      {e && (
        <Card>
          <CardHeader title="Scenario model" description={e.disclaimer} />
          <CardBody className="space-y-4">
            <ScenarioChart scenarios={e.scenarios} currency={e.inputs.currency} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>{["Scenario", "Lift", "Customers impacted", "Incremental revenue", "Gross profit", "Programme cost (12 mo)", "Net profit", "ROI", "Payback"].map((h) => <th key={h} className="pb-2 pr-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {e.scenarios.map((s) => (
                    <tr key={s.name}>
                      <td className="py-2 pr-3 font-medium capitalize">{s.name}</td>
                      <td className="py-2 pr-3">{s.liftPct}%</td>
                      <td className="py-2 pr-3">{s.customersImpacted.toLocaleString("en")}</td>
                      <td className="py-2 pr-3">{money(s.incrementalRevenue, e.inputs.currency)}</td>
                      <td className="py-2 pr-3">{money(s.incrementalGrossProfit, e.inputs.currency)}</td>
                      <td className="py-2 pr-3">{money(s.programCost, e.inputs.currency)}</td>
                      <td className="py-2 pr-3">{money(s.netProfit, e.inputs.currency)}</td>
                      <td className="py-2 pr-3">{s.roi === null ? "n/a" : `${Math.round(s.roi * 100)}%`}</td>
                      <td className="py-2">{s.paybackMonths === null ? "Not within horizon" : `${s.paybackMonths} mo`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Revenue impact ≠ profit impact. Revenue = customers impacted × average annual value. Gross profit applies margin. Net profit deducts investment and 12 months of run cost. ROI = net profit ÷ programme cost. Payback = investment ÷ (monthly gross profit − monthly run cost).
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
