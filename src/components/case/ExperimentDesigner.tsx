"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Card, CardBody, CardHeader, Input, Label, Select } from "@/components/ui";
import { designExperiment } from "@/engine/experiment";

const parse = (s: string) => {
  const n = Number(s.replace(/[,\s%]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? 0 : n;
};

/** Sample size, duration and detectable effect for a test-vs-control experiment (calculated in code). */
export function ExperimentDesigner() {
  const [f, setF] = useState({ baseline: "", mde: "10", weekly: "", control: "10", confidence: "0.95", power: "0.8" });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const plan = designExperiment({
    baselinePct: parse(f.baseline),
    mdeRelativePct: parse(f.mde),
    weeklyAudience: parse(f.weekly),
    controlPct: parse(f.control),
    confidence: Number(f.confidence) as 0.95,
    power: Number(f.power) as 0.8,
  });
  const field = (k: "baseline" | "mde" | "weekly" | "control", label: string, placeholder: string, hint: string) => (
    <div>
      <Label htmlFor={`exp-${k}`}>{label}</Label>
      <Input id={`exp-${k}`} inputMode="decimal" placeholder={placeholder} value={f[k]} onChange={(e) => set(k, e.target.value.replace(/[^\d.,]/g, ""))} />
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
  return (
    <Card>
      <CardHeader title="Experiment designer" description="How big and how long a test must be to prove the lift. Calculated in code, not by the AI." />
      <CardBody className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {field("baseline", "Baseline rate (%)", "e.g. 4", "Today's conversion, repeat or response rate.")}
          {field("mde", "Smallest lift worth detecting (%)", "e.g. 10", "Relative: 10 means 4.0% → 4.4%.")}
          {field("weekly", "Eligible audience per week", "e.g. 25,000", "People who would enter the test each week.")}
          {field("control", "Control group (%)", "e.g. 10", "Share held out to measure incrementality.")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:w-1/2">
          <div><Label htmlFor="exp-conf">Confidence</Label><Select id="exp-conf" value={f.confidence} onChange={(e) => set("confidence", e.target.value)}><option value="0.9">90%</option><option value="0.95">95%</option><option value="0.99">99%</option></Select></div>
          <div><Label htmlFor="exp-power">Power</Label><Select id="exp-power" value={f.power} onChange={(e) => set("power", e.target.value)}><option value="0.8">80%</option><option value="0.85">85%</option><option value="0.9">90%</option></Select></div>
        </div>
        <div className="flex gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-950">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          {plan ? (
            <div className="space-y-2">
              <p>{plan.summary}</p>
              <div className="flex flex-wrap gap-4 text-xs tabular-nums">
                <span><b>{plan.perArmTreatment.toLocaleString("en")}</b> treatment</span>
                <span><b>{plan.perArmControl.toLocaleString("en")}</b> control</span>
                <span><b>{plan.total.toLocaleString("en")}</b> total</span>
                {plan.weeks && <span><b>{plan.weeks}</b> week{plan.weeks > 1 ? "s" : ""}</span>}
                <span>detects <b>+{plan.absoluteLiftPts} pts</b></span>
              </div>
              {plan.weeks && plan.weeks > 8 && <p className="text-xs text-amber-800">Over 8 weeks: consider a larger lift threshold, a bigger control group or a wider audience.</p>}
            </div>
          ) : (
            <p className="text-muted">Enter a baseline rate between 0 and 100% and a control share to size the test.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
