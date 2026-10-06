"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { DEFAULT_MODELS, PROVIDER_KINDS, PROVIDER_LABELS, type ProviderKind } from "@/ai/types";
import type { PublicProvider } from "@/server/services/providers";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, Input, Label, PageHeader, Select, Spinner } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";

type TestResult = { ok: boolean; latencyMs: number; model: string; message: string };

export default function AiProvidersPage() {
  const { me } = useAuth();
  const canManage = me?.onboarded && ["owner", "admin"].includes(me.profile.role);
  const { data, loading, error, reload } = useApi<{ providers: PublicProvider[] }>("/api/ai/providers");
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="AI Providers"
        description="Bring your own keys. Keys are encrypted at rest (AES-256-GCM), used only server-side, and never shown again after saving. Providers run in priority order with automatic fallback."
        action={canManage && !adding && <Button onClick={() => setAdding(true)}>Add provider</Button>}
      />
      <ErrorNote error={error} />
      {adding && <ProviderForm onDone={() => { setAdding(false); void reload(); }} />}
      {loading ? <Spinner /> : data?.providers.length ? (
        <div className="space-y-4">
          {data.providers.map((p, i) => <ProviderRow key={p.id} p={p} primary={i === 0 && p.enabled} canManage={!!canManage} onChange={reload} />)}
        </div>
      ) : !adding && (
        <EmptyState icon={<KeyRound className="h-8 w-8" />} title="No AI provider configured" description="Add OpenAI, Anthropic, Google Gemini or any OpenAI-compatible endpoint to enable diagnosis, hypotheses, recommendations and reports." action={canManage && <Button onClick={() => setAdding(true)}>Add provider</Button>} />
      )}
    </div>
  );
}

function TestBadge({ r }: { r: TestResult }) {
  return r.ok ? (
    <div className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Connection successful · {r.model} · Latency: {r.latencyMs} ms</div>
  ) : (
    <div className="flex items-center gap-1.5 text-sm text-red-700"><XCircle className="h-4 w-4" /> {r.message}</div>
  );
}

function ProviderForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<ProviderKind>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [models, setModels] = useState(DEFAULT_MODELS.openai);
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const body = () => ({ kind, apiKey, ...(baseUrl ? { baseUrl } : {}), models });
  const missingModel = kind === "custom" && !models.reasoning.trim();
  const missingBase = kind === "custom" && !baseUrl.trim();

  return (
    <Card className="mb-6">
      <CardHeader title="Add AI provider" />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="kind">Provider</Label>
            <Select id="kind" value={kind} onChange={(e) => { const k = e.target.value as ProviderKind; setKind(k); setModels(DEFAULT_MODELS[k]); setTest(null); }}>
              {PROVIDER_KINDS.map((k) => <option key={k} value={k}>{PROVIDER_LABELS[k]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="key">API key</Label>
            <Input id="key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste key" />
          </div>
          {kind === "openrouter" && (
            <p className="text-sm text-muted sm:col-span-2">
              One key for hundreds of models. Create a key at{" "}
              <a className="text-brand-600 underline" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>{" "}
              and use model IDs from{" "}
              <a className="text-brand-600 underline" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">openrouter.ai/models</a>{" "}
              (format <code>vendor/model</code>, e.g. <code>google/gemini-2.5-flash</code>). Billing happens on your OpenRouter account.
            </p>
          )}
          {kind === "custom" && (
            <div className="sm:col-span-2">
              <Label htmlFor="base">Base URL</Label>
              <Input id="base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-endpoint.example.com/v1" />
            </div>
          )}
          {(["fast", "reasoning", "large"] as const).map((t) => (
            <div key={t}>
              <Label htmlFor={t} hint={{ fast: "(questions, extraction)", reasoning: "(diagnosis, hypotheses, strategy)", large: "(final report)" }[t]}>{t[0]!.toUpperCase() + t.slice(1)} model</Label>
              <Input id={t} value={models[t]} onChange={(e) => setModels({ ...models, [t]: e.target.value })} />
            </div>
          ))}
        </div>
        {(missingBase || missingModel) && (
          <p className="text-sm text-amber-700">
            {missingBase ? "Enter the provider's Base URL. " : ""}
            {missingModel ? "Enter at least the Reasoning model name (blank Fast/Large fields reuse it)." : ""}
          </p>
        )}
        {test && <TestBadge r={test} />}
        <ErrorNote error={err} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button variant="outline" loading={busy === "test"} disabled={!apiKey || missingModel || missingBase} onClick={async () => {
            setBusy("test"); setErr(null);
            try { setTest(await apiFetch<TestResult>("/api/ai/test-provider", { body: body() })); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
          }}>Test connection</Button>
          <Button loading={busy === "save"} disabled={!apiKey || missingModel || missingBase} onClick={async () => {
            setBusy("save"); setErr(null);
            try { await apiFetch("/api/ai/providers", { body: body() }); onDone(); } catch (e) { setErr((e as Error).message); setBusy(null); }
          }}>Save</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ProviderRow({ p, primary, canManage, onChange }: { p: PublicProvider; primary: boolean; canManage: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(p.lastTest ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setErr(null);
    try { await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold">{p.label} {primary && <Badge tone="blue">Primary</Badge>} {!p.enabled && <Badge>Disabled</Badge>}</div>
            <div className="mt-0.5 font-mono text-sm text-muted">{p.keyMask}</div>
            <div className="mt-1 text-xs text-muted">Fast: {p.models.fast} · Reasoning: {p.models.reasoning} · Large: {p.models.large} · Priority {p.priority}{p.baseUrl ? ` · ${p.baseUrl}` : ""}</div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" loading={busy === "test"} onClick={() => act("test", async () => setTest(await apiFetch<TestResult>(`/api/ai/providers/${p.id}/test`, { body: {} })))}>Test connection</Button>
              <Button size="sm" variant="ghost" loading={busy === "toggle"} onClick={() => act("toggle", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "PATCH", body: { enabled: !p.enabled } }); onChange(); })}>{p.enabled ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="ghost" loading={busy === "delete"} onClick={() => confirm(`Delete ${p.label} and its stored key?`) && act("delete", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "DELETE" }); onChange(); })}>Delete</Button>
            </div>
          )}
        </div>
        {test && <TestBadge r={test} />}
        {canManage && (
          <div className="flex gap-2">
            <Input type="password" autoComplete="off" className="max-w-xs" placeholder="Rotate key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!newKey} loading={busy === "rotate"} onClick={() => act("rotate", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "PATCH", body: { apiKey: newKey } }); setNewKey(""); setTest(null); onChange(); })}>Replace key</Button>
          </div>
        )}
        <ErrorNote error={err} />
      </CardBody>
    </Card>
  );
}
