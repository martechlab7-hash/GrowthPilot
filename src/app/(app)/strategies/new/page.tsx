"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Check, Gauge, Globe, HeartHandshake, Layers, Plus, Puzzle, Rocket, ShieldCheck, Sparkles, Store, Target, Trash2, Turtle, Wrench, Zap,
} from "lucide-react";
import type { Case, StrategySettings } from "@/domain/types";
import { INDUSTRY_OPTIONS } from "@/knowledge/industries";
import { Button, Card, CardBody, ErrorNote, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/cn";

type Opt<T extends string> = { id: T; title: string; hint: string; icon: typeof Rocket };

const TYPES: Opt<StrategySettings["type"]>[] = [
  { id: "existing", title: "Improve my existing marketing", hint: "Optimise what runs today: performance, CAC, channels", icon: Wrench },
  { id: "gtm", title: "New go-to-market strategy", hint: "Enter a new market, segment or region", icon: Globe },
  { id: "launch", title: "Launch a product or service", hint: "Positioning, audience, launch phases", icon: Rocket },
  { id: "growth_problem", title: "Solve a specific growth problem", hint: "A target to hit or a gap to close", icon: Target },
  { id: "retention", title: "Retention, loyalty or win-back", hint: "Keep customers and bring them back", icon: HeartHandshake },
  { id: "full", title: "Complete strategy from scratch", hint: "End-to-end marketing strategy", icon: Layers },
];
const SCOPES: Opt<StrategySettings["scope"]>[] = [
  { id: "end_to_end", title: "End-to-end", hint: "Every channel and the full funnel", icon: Layers },
  { id: "digital", title: "Digital only", hint: "Online channels and funnel", icon: Globe },
  { id: "crm", title: "CRM & lifecycle", hint: "Retention and owned channels", icon: HeartHandshake },
  { id: "paid", title: "Paid acquisition", hint: "Advertising and budgets", icon: Zap },
  { id: "launch", title: "Launch & GTM", hint: "Go-to-market plan", icon: Rocket },
];
const COMPETITOR: Opt<StrategySettings["competitor"]>[] = [
  { id: "none", title: "No competitor research", hint: "Focus on your own business", icon: ShieldCheck },
  { id: "research", title: "Research, no comparisons", hint: "Observable activity of named competitors", icon: Puzzle },
  { id: "compare", title: "Research and compare", hint: "Side-by-side with your business", icon: Gauge },
];
const CHANNEL_PREF: Opt<StrategySettings["channelPreference"]>[] = [
  { id: "optimize", title: "Optimise existing channels", hint: "No new channels", icon: Wrench },
  { id: "optimize_and_new", title: "Optimise and suggest new", hint: "Improve, then add where it pays", icon: Plus },
  { id: "best", title: "Find the best channels", hint: "Evaluate everything, new included", icon: Sparkles },
];
const PACE: Opt<StrategySettings["pace"]>[] = [
  { id: "aggressive", title: "Aggressive", hint: "Speed first: parallel work, minimum viable launch", icon: Zap },
  { id: "balanced", title: "Balanced", hint: "Phased, standard QA, controlled tests", icon: Gauge },
  { id: "conservative", title: "Conservative", hint: "Pilot first, validate, then scale", icon: Turtle },
];
const HORIZONS: [StrategySettings["horizon"], string][] = [["30d", "30 days · quick wins"], ["90d", "90 days · implement & optimise"], ["180d", "180 days · phased transformation"], ["12m", "12 months · annual roadmap"]];
const RESOURCES: Opt<StrategySettings["resources"]>[] = [
  { id: "existing", title: "Existing team & tools only", hint: "No new spend on people or tech", icon: ShieldCheck },
  { id: "limited", title: "Limited investment", hint: "Some hiring, agency or tools", icon: Plus },
  { id: "flexible", title: "Flexible", hint: "If the business case supports it", icon: Sparkles },
];
const CHANNELS: Opt<"offline" | "online" | "omni">[] = [
  { id: "offline", title: "Offline", hint: "Stores, dealers, field sales", icon: Store },
  { id: "online", title: "Online", hint: "Website, app, marketplaces", icon: Globe },
  { id: "omni", title: "Both", hint: "Online and offline", icon: Layers },
];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "JPY"];
const STEPS = ["Goal", "Scope", "Timeline", "Business"];

export default function NewStrategyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<StrategySettings>({
    type: "existing", scope: "end_to_end", competitor: "none", channelPreference: "optimize_and_new",
    pace: "balanced", horizon: "90d", resources: "limited", competitors: [],
  });
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [industry, setIndustry] = useState("");
  const [channel, setChannel] = useState<"offline" | "online" | "omni" | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<StrategySettings>) => setSettings((s) => ({ ...s, ...p }));
  const researching = settings.competitor !== "none";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const competitors = settings.competitors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), ...(c.url?.trim() ? { url: c.url.trim() } : {}) }));
      const res = await apiFetch<{ case: Case }>("/api/strategies", {
        body: {
          name, brief, currency, ...(industry ? { industry } : {}), ...(channel ? { salesChannel: channel } : {}),
          settings: { ...settings, competitors: researching ? competitors : [], ...(settings.launchDate ? {} : { launchDate: undefined }) },
        },
      });
      router.push(`/strategies/${res.case.id}?tab=interview`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const canNext = step < 3 || (name.trim().length >= 3 && brief.trim().length >= 20);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New strategy" description="A few choices first; then I'll interview you like a strategy consultant." />
      <ol className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={cn("h-px w-6", i <= step ? "bg-brand-500" : "bg-line-strong")} />}
            <button type="button" onClick={() => i < step && setStep(i)} className={cn("flex items-center gap-1.5", i < step && "cursor-pointer")}>
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className={i === step ? "text-ink" : "text-muted"}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardBody className="space-y-6 p-6">
          {step === 0 && (
            <Section title="What are you trying to build?">
              <Cards options={TYPES} value={settings.type} onChange={(type) => set({ type, scope: type === "gtm" || type === "launch" ? "launch" : type === "retention" ? "crm" : settings.scope })} cols={3} />
            </Section>
          )}

          {step === 1 && (
            <>
              <Section title="Strategy scope"><Cards options={SCOPES} value={settings.scope} onChange={(scope) => set({ scope })} cols={3} /></Section>
              <Section title="Channel recommendations"><Cards options={CHANNEL_PREF} value={settings.channelPreference} onChange={(channelPreference) => set({ channelPreference })} cols={3} /></Section>
              <Section title="Competitor intelligence" hint="Optional. Research uses competitors' public pages only; spend and private results are never estimated.">
                <Cards options={COMPETITOR} value={settings.competitor} onChange={(competitor) => set({ competitor })} cols={3} />
                {researching && (
                  <div className="mt-4 space-y-2">
                    {settings.competitors.map((c, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                        <Input value={c.name} onChange={(e) => set({ competitors: settings.competitors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Competitor name" aria-label={`Competitor ${i + 1} name`} />
                        <Input value={c.url ?? ""} onChange={(e) => set({ competitors: settings.competitors.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="Website (optional), e.g. rival.com" aria-label={`Competitor ${i + 1} website`} />
                        <button type="button" onClick={() => set({ competitors: settings.competitors.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-subtle hover:bg-canvas hover:text-red-600" aria-label={`Remove competitor ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {settings.competitors.length < 6 && (
                      <button type="button" onClick={() => set({ competitors: [...settings.competitors, { name: "", url: "" }] })} className="flex items-center gap-1 text-sm font-medium text-brand-600"><Plus className="h-4 w-4" /> Add competitor</button>
                    )}
                  </div>
                )}
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              <Section title="Execution pace" hint="You can compare all three later; this is the plan shown by default.">
                <Cards options={PACE} value={settings.pace} onChange={(pace) => set({ pace })} cols={3} />
              </Section>
              <Section title="Planning horizon">
                <div className="flex flex-wrap gap-2">
                  {HORIZONS.map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={settings.horizon === id} onClick={() => set({ horizon: id })} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition", settings.horizon === id ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-line hover:border-line-strong")}>{label}</button>
                  ))}
                </div>
              </Section>
              <Section title="Execution resources"><Cards options={RESOURCES} value={settings.resources} onChange={(resources) => set({ resources })} cols={3} /></Section>
              <Section title="Target launch date" hint="Optional. If it's not realistic, I'll show the trade-offs and a minimum viable launch.">
                <Input type="date" className="max-w-[12rem]" value={settings.launchDate ?? ""} onChange={(e) => set({ launchDate: e.target.value || undefined })} aria-label="Target launch date" />
              </Section>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="name">Strategy name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FY27 growth strategy – Acme Shoes" /></div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    <option value="">Not specified</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="brief">The business and what you want</Label>
                <Textarea id="brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. We sell running shoes online and in 12 stores in Maharashtra. We want to grow revenue 30% in 12 months without raising CAC." />
                <p className="mt-1 text-xs text-muted">Avoid personal customer data. Emails and phone numbers are masked before reaching an AI provider.</p>
              </div>
              <Section title="Where do your sales happen?"><Cards options={CHANNELS} value={channel} onChange={setChannel} cols={3} /></Section>
              <div className="w-40">
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
              </div>
            </>
          )}

          <ErrorNote error={error} />
          <div className="flex items-center justify-between border-t border-line pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button loading={busy} disabled={!canNext} onClick={() => void submit()}>Start the interview <ArrowRight className="h-4 w-4" /></Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}{hint && <span className="ml-2 font-normal text-muted">{hint}</span>}</legend>
      {children}
    </fieldset>
  );
}

function Cards<T extends string>({ options, value, onChange, cols }: { options: Opt<T>[]; value: T | null; onChange: (v: T) => void; cols: 2 | 3 }) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(o.id)}
            className={cn("flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition", on ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15" : "border-line bg-white hover:border-line-strong")}>
            <o.icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-brand-600" : "text-subtle")} />
            <span className="min-w-0"><span className="block text-sm font-semibold">{o.title}</span><span className="block text-xs text-muted">{o.hint}</span></span>
          </button>
        );
      })}
    </div>
  );
}
