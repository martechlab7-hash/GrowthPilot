"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Case } from "@/domain/types";
import { INDUSTRY_OPTIONS } from "@/knowledge/industries";
import { Button, Card, CardBody, Chip, ErrorNote, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";

const MODELS = ["B2B", "B2C", "B2B2C", "Marketplace", "Subscription", "Transaction"];
const OBJECTIVES = ["Increase revenue", "Increase retention", "Reduce churn", "Improve conversion", "Increase customer lifetime value", "Reduce CAC", "Increase engagement"];
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
  const [error, setError] = useState<string | null>(null);
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
