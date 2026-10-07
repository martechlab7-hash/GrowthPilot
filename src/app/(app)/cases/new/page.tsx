"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Globe, Layers, Store, TrendingDown, TrendingUp, Undo2, type LucideIcon } from "lucide-react";
import { detectChannel, detectGoal, type CaseGoal, type SalesChannel } from "@/engine/caseProfile";
import { cn } from "@/lib/cn";
import type { Case } from "@/domain/types";
import { INDUSTRY_OPTIONS } from "@/knowledge/industries";
import { Button, Card, CardBody, Chip, ErrorNote, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";

const MODELS = ["B2B", "B2C", "B2B2C", "Marketplace", "Subscription", "Transaction"];
const OBJECTIVES = ["Increase revenue", "Increase retention", "Reduce churn", "Improve conversion", "Increase customer lifetime value", "Reduce CAC", "Increase engagement"];
const GOALS: { id: CaseGoal; title: string; hint: string; icon: LucideIcon }[] = [
  { id: "decline", title: "Fix a drop", hint: "Something fell from X to Y", icon: TrendingDown },
  { id: "growth", title: "Grow", hint: "Hit a target, e.g. +5% revenue", icon: TrendingUp },
  { id: "both", title: "Recover, then grow", hint: "Get back and go beyond", icon: Undo2 },
];
const CHANNELS: { id: SalesChannel; title: string; hint: string; icon: LucideIcon }[] = [
  { id: "offline", title: "Offline", hint: "Stores, dealers, field sales", icon: Store },
  { id: "online", title: "Online", hint: "Website, app, marketplaces", icon: Globe },
  { id: "omni", title: "Both", hint: "Online and offline", icon: Layers },
];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "JPY"];

export default function NewCasePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [more, setMore] = useState(false);
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [revenueModel, setRevenueModel] = useState("");
  const [tools, setTools] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [goal, setGoal] = useState<CaseGoal | null>(null);
  const [channel, setChannel] = useState<SalesChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Until the user picks, show what the description suggests; the interview confirms it.
  const detected = useMemo(() => ({ goal: detectGoal(`${name}. ${problem}`), channel: detectChannel(`${name}. ${problem}`) }), [name, problem]);
  const [busy, setBusy] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ case: Case }>("/api/cases", {
        body: {
          name, problemStatement: problem, currency,
          ...(industry && { industry }), ...(geography && { geography }), ...(companySize && { companySize }),
          ...(models.length && { businessModel: models }), ...(objectives.length && { objective: objectives }),
          ...(revenueModel && { revenueModel }), ...(tools && { existingTools: tools }),
          ...(goal && { goal }), ...(channel && { salesChannel: channel }),
        },
      });
      router.push(`/cases/${res.case.id}?tab=interview`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New Marketing Case" description="Describe the problem. You don't need every detail — the AI consultant will ask for what matters." />
      <Card>
        <CardBody className="py-6">
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <Label htmlFor="name">Case name</Label>
              <Input id="name" required minLength={3} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Improve Customer Retention – Airline" />
            </div>
            <div>
              <Label htmlFor="problem">Problem statement</Label>
              <Textarea id="problem" required minLength={20} rows={6} value={problem} onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe the problem you are trying to solve. e.g. Our airline has seen a decline in repeat bookings over the last 12 months. We want to understand why and identify ways to improve customer retention." />
              <p className="mt-1 text-xs text-muted">Avoid personal customer data. Any emails or phone numbers are masked before reaching an AI provider.</p>
            </div>

            <ChoiceRow
              label="What kind of case is this?"
              options={GOALS}
              value={goal}
              detected={detected.goal}
              onChange={setGoal}
            />
            <ChoiceRow
              label="Where do your sales happen?"
              options={CHANNELS}
              value={channel}
              detected={detected.channel}
              onChange={setChannel}
            />

            <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-sm font-medium text-brand-600">
              <ChevronDown className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} /> Optional information
            </button>
            {more && (
              <div className="grid gap-4 rounded-lg border border-line bg-canvas p-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    <option value="">Not specified</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="geo">Geography</Label>
                  <Input id="geo" value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="e.g. India, Middle East" />
                </div>
                <div>
                  <Label htmlFor="size">Company size</Label>
                  <Select id="size" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                    <option value="">Not specified</option>
                    {["Startup (<50)", "SMB (50–250)", "Mid-market (250–1,000)", "Enterprise (1,000+)"].map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </div>
                <fieldset className="sm:col-span-2">
                  <Label>Business model</Label>
                  <div className="flex flex-wrap gap-2">
                    {MODELS.map((m) => <Chip key={m} active={models.includes(m)} onClick={() => toggle(models, setModels, m)}>{m}</Chip>)}
                  </div>
                </fieldset>
                <fieldset className="sm:col-span-2">
                  <Label>Primary objective</Label>
                  <div className="flex flex-wrap gap-2">
                    {OBJECTIVES.map((m) => <Chip key={m} active={objectives.includes(m)} onClick={() => toggle(objectives, setObjectives, m)}>{m}</Chip>)}
                  </div>
                </fieldset>
                <div>
                  <Label htmlFor="rev">Revenue model</Label>
                  <Input id="rev" value={revenueModel} onChange={(e) => setRevenueModel(e.target.value)} placeholder="e.g. Ticket sales + ancillaries" />
                </div>
                <div>
                  <Label htmlFor="tools">Existing tools</Label>
                  <Input id="tools" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="e.g. Salesforce, Braze, GA4" />
                </div>
              </div>
            )}
            <ErrorNote error={error} />
            <div className="flex justify-end">
              <Button type="submit" loading={busy}>Start diagnostic</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function ChoiceRow<T extends string>({ label, options, value, detected, onChange }: { label: string; options: { id: T; title: string; hint: string; icon: LucideIcon }[]; value: T | null; detected: T | undefined; onChange: (v: T | null) => void }) {
  const shown = value ?? detected ?? null;
  return (
    <fieldset>
      <legend className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
        {label}
        {!value && detected && <span className="text-xs font-normal text-muted">Suggested from your description. I&apos;ll confirm it in the interview.</span>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const active = shown === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={value === o.id}
              onClick={() => onChange(value === o.id ? null : o.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                active ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15" : "border-line bg-white hover:border-line-strong",
                active && !value && "border-dashed",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-brand-600" : "text-subtle")} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-muted">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
