"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import type { EconomicsInputs, KnowledgeKind } from "@/domain/types";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, Input, KindBadge, Label, Select, Spinner } from "@/components/ui";
import { ScenarioChart } from "@/components/charts";
import { apiFetch } from "@/lib/client/api";
import { money } from "@/reports/model";
import { computeScenario } from "@/engine/economics";
import { DEFAULT_ECONOMICS_MODEL, ECONOMICS_MODELS, getEconomicsModel, modelForProblem } from "@/engine/economicsModels";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "./Workspace";

type Defaults = { defaults: { inputs: EconomicsInputs; provenance: Record<string, KnowledgeKind> } };
type NumKey = "volume" | "value" | "margin" | "investment" | "run" | "conservative" | "base" | "aggressive";
type Form = Record<NumKey, string> & { model: string; currency: string };

/** Numbers are edited as text, so fields can be empty and never show a stuck leading zero. */
const toText = (n: number | undefined, blankZero = true) => (n === undefined || (blankZero && n === 0) ? "" : String(n));
const parse = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? undefined : n;
};
const group = (s: string) => {
  const n = parse(s);
  return n === undefined ? s : n.toLocaleString("en", { maximumFractionDigits: 2 });
};

function toForm(i: EconomicsInputs, fallbackModel: string): Form {
  return {
    model: i.model ?? fallbackModel,
    currency: i.currency,
    volume: toText(i.eligibleCustomers),
    value: toText(i.averageAnnualValue),
    margin: toText(i.grossMarginPct),
    investment: toText(i.investment),
    run: toText(i.monthlyRunCost),
    conservative: toText(i.scenarioLifts.conservative, false),
    base: toText(i.scenarioLifts.base, false),
    aggressive: toText(i.scenarioLifts.aggressive, false),
  };
}

function toInputs(f: Form): EconomicsInputs {
  return {
    currency: f.currency || "USD",
    model: f.model,
    eligibleCustomers: parse(f.volume) ?? 0,
    averageAnnualValue: parse(f.value) ?? 0,
    grossMarginPct: parse(f.margin) ?? 0,
    investment: parse(f.investment) ?? 0,
    monthlyRunCost: parse(f.run) ?? 0,
    scenarioLifts: { conservative: parse(f.conservative) ?? 0, base: parse(f.base) ?? 0, aggressive: parse(f.aggressive) ?? 0 },
  };
}

export function EconomicsView({ view, ctl, canContribute }: CaseTabProps) {
  const c = view.case;
  const suggested = modelForProblem(c.problemTypes);
  const [form, setForm] = useState<Form | null>(c.economics ? toForm(c.economics.inputs, suggested.id) : null);
  const [prov, setProv] = useState<Record<string, KnowledgeKind>>(c.economics?.inputProvenance ?? {});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (form) return;
    apiFetch<Defaults>(`/api/cases/${c.id}/economics`).then((d) => {
      setForm(toForm(d.defaults.inputs, suggested.id));
      setProv(d.defaults.provenance);
    }).catch(() => {});
  }, [c.id, form, suggested.id]);

  if (!form) return <Spinner label="Loading economics…" />;
  const model = getEconomicsModel(form.model) ?? DEFAULT_ECONOMICS_MODEL;
  const set = (k: keyof Form, v: string) => setForm({ ...form, [k]: v });
  const e = c.economics;
  const shownModel = getEconomicsModel(e?.inputs.model) ?? model;

  const switchModel = async (id: string) => {
    const d = await apiFetch<Defaults>(`/api/cases/${c.id}/economics?model=${id}`);
    const next = toForm(d.defaults.inputs, id);
    // Keep anything the user already typed; take pre-filled answers only for empty fields.
    setForm({ ...next, ...Object.fromEntries((["volume", "value", "margin", "investment", "run"] as const).filter((k) => form[k] !== "").map((k) => [k, form[k]])), model: id, currency: form.currency });
    setProv(d.defaults.provenance);
  };

  const inputs = toInputs(form);
  const ready = inputs.eligibleCustomers > 0 && inputs.averageAnnualValue > 0 && inputs.grossMarginPct > 0;
  const preview = ready ? computeScenario(inputs, "base", inputs.scenarioLifts.base) : null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Business case"
          description="Values pre-filled from your answers are facts; anything you type is treated as an assumption. The maths runs in code, not in the AI, so it is reproducible."
        />
        <CardBody>
          <form
            className="space-y-6"
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (!ready) return setErr(`Fill in ${[!inputs.eligibleCustomers && model.volume.label, !inputs.averageAnnualValue && model.value.label, !inputs.grossMarginPct && "Gross margin"].filter(Boolean).join(", ")} to calculate.`);
              setErr(null);
              await ctl.run("Calculating", "/economics", { method: "PUT", body: inputs });
            }}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <div>
                <Label htmlFor="model">What are we modelling?</Label>
                <Select id="model" value={form.model} disabled={!canContribute} onChange={(ev) => void switchModel(ev.target.value)}>
                  {ECONOMICS_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === suggested.id ? " (suggested for this case)" : ""}</option>)}
                </Select>
                <p className="mt-1 text-xs text-muted">{model.description}</p>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" maxLength={3} value={form.currency} disabled={!canContribute} onChange={(ev) => set("currency", ev.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <NumberField id="eligibleCustomers" label={model.volume.label} hint={model.volume.hint} placeholder={model.volume.placeholder} value={form.volume} onChange={(v) => set("volume", v)} kind={prov.eligibleCustomers} disabled={!canContribute} />
              <NumberField id="averageAnnualValue" label={model.value.label} hint={model.value.hint} placeholder={model.value.placeholder} unit={form.currency} value={form.value} onChange={(v) => set("value", v)} kind={prov.averageAnnualValue} disabled={!canContribute} />
              <NumberField id="grossMarginPct" label="Gross margin" hint="Share of revenue left after direct costs." placeholder="e.g. 30" unit="%" value={form.margin} onChange={(v) => set("margin", v)} kind={prov.grossMarginPct} disabled={!canContribute} />
              <NumberField id="investment" label="One-off investment" hint="Set-up cost: tools, build, agency, creative." placeholder="0 if none" unit={form.currency} value={form.investment} onChange={(v) => set("investment", v)} kind="assumption" disabled={!canContribute} />
              <NumberField id="monthlyRunCost" label="Monthly run cost" hint="Ongoing cost: media, incentives, licences, people." placeholder="0 if none" unit={form.currency} value={form.run} onChange={(v) => set("run", v)} kind="assumption" disabled={!canContribute} />
            </div>

            <div className="rounded-xl border border-line bg-canvas/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">{model.lift.label} <KindBadge kind="assumption" /></div>
              <p className="mb-3 text-xs text-muted">{model.lift.hint} Validate the base case with a control group before scaling.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["conservative", "base", "aggressive"] as const).map((k) => (
                  <NumberField key={k} id={k} label={k.charAt(0).toUpperCase() + k.slice(1)} unit="%" value={form[k]} onChange={(v) => set(k, v)} disabled={!canContribute} compact />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm", preview ? "bg-brand-50 text-brand-900" : "bg-canvas text-muted")}>
                <Calculator className="h-4 w-4 shrink-0" />
                {preview ? (
                  <span>
                    Base case: <b>{preview.customersImpacted.toLocaleString("en")}</b> {model.impacted.toLowerCase()} → <b>{money(preview.incrementalRevenue, inputs.currency)}</b> revenue, <b>{money(preview.incrementalGrossProfit, inputs.currency)}</b> gross profit
                    {preview.roi !== null ? <>, ROI <b>{Math.round(preview.roi * 100)}%</b></> : null}
                  </span>
                ) : (
                  <span>Fill in the first three fields to see a live estimate.</span>
                )}
              </div>
              {canContribute && <Button type="submit" loading={ctl.busy === "Calculating"}>Calculate</Button>}
            </div>
            <ErrorNote error={err} />
          </form>
        </CardBody>
      </Card>

      {e && (
        <Card>
          <CardHeader title="Scenario model" description={e.disclaimer} action={<Badge>{shownModel.name}</Badge>} />
          <CardBody className="space-y-4">
            <ScenarioChart scenarios={e.scenarios} currency={e.inputs.currency} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>{["Scenario", "Lift", shownModel.impacted, "Incremental revenue", "Gross profit", "Programme cost (12 mo)", "Net profit", "ROI", "Payback"].map((h) => <th key={h} className="pb-2 pr-3">{h}</th>)}</tr>
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
              {shownModel.impacted} = {shownModel.volume.label.toLowerCase()} × lift. Revenue = that × {shownModel.value.label.toLowerCase()}. Gross profit applies margin; net profit deducts the investment and 12 months of run cost. Revenue impact is not profit impact.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function NumberField({ id, label, hint, placeholder, unit, value, onChange, kind, disabled, compact }: {
  id: string; label: string; hint?: string; placeholder?: string; unit?: string; value: string; onChange: (v: string) => void; kind?: KnowledgeKind; disabled?: boolean; compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {kind && !compact && <KindBadge kind={kind} />}
      </div>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={focused ? value : group(value)}
          disabled={disabled}
          onFocus={(ev) => { setFocused(true); ev.currentTarget.select(); }}
          onBlur={() => setFocused(false)}
          onChange={(ev) => onChange(ev.target.value.replace(/[^\d.,]/g, ""))}
          className={cn("tabular-nums", unit && "pr-14")}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-subtle">{unit}</span>}
      </div>
      {hint && !compact && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
