"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, KeyRound, Plus, Trash2, XCircle } from "lucide-react";
import { DEFAULT_MODELS, PROVIDER_KINDS, PROVIDER_LABELS, type ModelMap, type ProviderKind } from "@/ai/types";
import type { PublicProvider } from "@/server/services/providers";
import { Badge, Button, Card, CardBody, ErrorNote, Input, Label, Spinner } from "@/components/ui";
import { OwlSays, type MascotMood } from "@/components/mascot";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";
import { cn } from "@/lib/cn";

type TestResult = { ok: boolean; latencyMs: number; model: string; message: string };

const PROVIDER_INFO: Record<ProviderKind, { blurb: string; keyUrl?: string; keyHint: string }> = {
  openai: { blurb: "GPT models from OpenAI.", keyUrl: "https://platform.openai.com/api-keys", keyHint: "Starts with sk-" },
  anthropic: { blurb: "Claude models from Anthropic.", keyUrl: "https://console.anthropic.com/settings/keys", keyHint: "Starts with sk-ant-" },
  gemini: { blurb: "Gemini models from Google AI Studio.", keyUrl: "https://aistudio.google.com/apikey", keyHint: "From Google AI Studio" },
  openrouter: { blurb: "One key, hundreds of models from every vendor.", keyUrl: "https://openrouter.ai/keys", keyHint: "Starts with sk-or-" },
  custom: { blurb: "Any OpenAI-compatible endpoint (Azure, Groq, Together, local…).", keyHint: "Your endpoint's API key" },
};

export default function AiProvidersPage() {
  const { me } = useAuth();
  const canManage = !!me?.onboarded && ["owner", "admin"].includes(me.profile.role);
  const { data, loading, error, reload } = useApi<{ providers: PublicProvider[] }>("/api/ai/providers");
  const [adding, setAdding] = useState(false);
  const [owl, setOwl] = useState<{ mood: MascotMood | null; tone: "default" | "success" | "error" | "working"; text: string } | null>(null);
  const providers = data?.providers ?? [];

  const say = owl ?? (providers.length
    ? { mood: null, tone: "default" as const, text: `You have ${providers.length} provider${providers.length > 1 ? "s" : ""}. I'll use them top to bottom, and fall back to the next one automatically if one fails. Pick a specific model per case from the AI model menu.` }
    : { mood: null, tone: "default" as const, text: "Hi, I'm Pilot! I need an AI provider before I can diagnose cases. Add one below — your key is encrypted and never shown again." });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 bg-gradient-to-br from-brand-50 via-white to-violet-50 px-6 py-5">
          <OwlSays size={84} mood={say.mood} tone={say.tone}>{say.text}</OwlSays>
          {canManage && !adding && (
            <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button>
          )}
        </div>
      </Card>

      <ErrorNote error={error} />
      {adding && <ProviderWizard onOwl={setOwl} onDone={() => { setAdding(false); setOwl(null); void reload(); }} />}

      {loading ? (
        <Spinner />
      ) : providers.length ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Configured providers · run in this order</h2>
          {providers.map((p, i) => (
            <ProviderRow key={p.id} p={p} index={i} count={providers.length} canManage={canManage} onChange={reload} onOwl={setOwl} neighbours={providers} />
          ))}
        </div>
      ) : (
        !adding && (
          <Card className="p-8 text-center text-sm text-muted">
            <KeyRound className="mx-auto mb-2 h-6 w-6" /> No AI provider yet.
          </Card>
        )
      )}
    </div>
  );
}

function TestBadge({ r }: { r: TestResult }) {
  return r.ok ? (
    <div className="flex animate-fade-in items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Connected · {r.model} · {r.latencyMs} ms</div>
  ) : (
    <div className="flex animate-fade-in items-start gap-1.5 text-sm text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {r.message}</div>
  );
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", done ? "bg-emerald-500 text-white" : "bg-brand-600 text-white")}>{done ? "✓" : n}</span>
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="mb-3 text-sm font-semibold">{title}</div>
        {children}
      </div>
    </div>
  );
}

function ProviderWizard({ onDone, onOwl }: { onDone: () => void; onOwl: (o: { mood: MascotMood | null; tone: "default" | "success" | "error" | "working"; text: string } | null) => void }) {
  const [kind, setKind] = useState<ProviderKind>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [models, setModels] = useState<ModelMap>(DEFAULT_MODELS.openrouter);
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const body = () => ({ kind, apiKey, ...(baseUrl ? { baseUrl } : {}), models });
  const missingModel = kind === "custom" && !models.reasoning.trim();
  const missingBase = kind === "custom" && !baseUrl.trim();
  const info = PROVIDER_INFO[kind];

  const runTest = async () => {
    setBusy("test");
    setErr(null);
    onOwl({ mood: "sparkle", tone: "working", text: "Let me knock on the door… sending a tiny test request." });
    try {
      const r = await apiFetch<TestResult>("/api/ai/test-provider", { body: body() });
      setTest(r);
      onOwl(r.ok
        ? { mood: "delighted", tone: "success", text: `It works! ${r.model} answered in ${r.latencyMs} ms. Save it and I'm ready to go.` }
        : { mood: "dizzy", tone: "error", text: `That didn't work: ${r.message}. Check the key and model names.` });
    } catch (e) {
      setErr((e as Error).message);
      onOwl({ mood: "dizzy", tone: "error", text: "Something went wrong while testing. Details are below the form." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardBody className="p-6">
        <Step n={1} title="Choose a provider" done>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDER_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); setModels(DEFAULT_MODELS[k]); setTest(null); onOwl(null); }}
                className={cn("rounded-xl border p-3 text-left transition", kind === k ? "border-brand-500 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.12)]" : "border-line hover:border-line-strong hover:bg-canvas")}
              >
                <div className="text-sm font-semibold">{PROVIDER_LABELS[k]}</div>
                <div className="mt-0.5 text-xs text-muted">{PROVIDER_INFO[k].blurb}</div>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Paste your API key" done={!!apiKey}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="key" hint={`(${info.keyHint})`}>API key</Label>
              <Input id="key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste key" />
              {info.keyUrl && (
                <a href={info.keyUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  Get a key <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {kind === "custom" && (
              <div>
                <Label htmlFor="base">Base URL</Label>
                <Input id="base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
              </div>
            )}
          </div>
        </Step>

        <Step n={3} title="Pick models" done={!missingModel}>
          <p className="mb-3 text-xs text-muted">
            Fast handles questions and extraction, Reasoning does diagnosis and strategy, Large writes the final report.
            {kind === "openrouter" && <> Model IDs come from <a className="text-brand-600 underline" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">openrouter.ai/models</a>.</>}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["fast", "reasoning", "large"] as const).map((t) => (
              <div key={t}>
                <Label htmlFor={t}>{t[0]!.toUpperCase() + t.slice(1)}</Label>
                <Input id={t} value={models[t]} onChange={(e) => setModels({ ...models, [t]: e.target.value })} placeholder={t === "reasoning" ? "required" : "defaults to Reasoning"} />
              </div>
            ))}
          </div>
        </Step>

        <Step n={4} title="Test and save" done={!!test?.ok}>
          {(missingBase || missingModel) && (
            <p className="mb-2 text-sm text-amber-700">{missingBase ? "Enter the Base URL. " : ""}{missingModel ? "Enter at least the Reasoning model." : ""}</p>
          )}
          {test && <div className="mb-3"><TestBadge r={test} /></div>}
          <ErrorNote error={err} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" loading={busy === "test"} disabled={!apiKey || missingModel || missingBase} onClick={runTest}>Test connection</Button>
            <Button loading={busy === "save"} disabled={!apiKey || missingModel || missingBase} onClick={async () => {
              setBusy("save");
              setErr(null);
              try {
                await apiFetch("/api/ai/providers", { body: body() });
                onDone();
              } catch (e) {
                setErr((e as Error).message);
                setBusy(null);
              }
            }}>Save provider</Button>
            <Button variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Step>
      </CardBody>
    </Card>
  );
}

function ProviderRow({ p, index, count, canManage, onChange, onOwl, neighbours }: {
  p: PublicProvider; index: number; count: number; canManage: boolean; onChange: () => void; neighbours: PublicProvider[];
  onOwl: (o: { mood: MascotMood | null; tone: "default" | "success" | "error" | "working"; text: string } | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(p.lastTest ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  // Swap priorities with the neighbour to reorder.
  const move = (dir: -1 | 1) => act("move", async () => {
    const other = neighbours[index + dir];
    if (!other) return;
    await apiFetch(`/api/ai/providers/${p.id}`, { method: "PATCH", body: { priority: other.priority === p.priority ? p.priority + dir : other.priority } });
    await apiFetch(`/api/ai/providers/${other.id}`, { method: "PATCH", body: { priority: p.priority } });
    onChange();
  });
  const status = !p.enabled ? "off" : test ? (test.ok ? "ok" : "fail") : "untested";

  return (
    <Card className="animate-fade-in">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", status === "ok" && "bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.15)]", status === "fail" && "bg-red-500", status === "untested" && "bg-amber-400", status === "off" && "bg-slate-300")} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {p.label} {index === 0 && p.enabled && <Badge tone="blue">Primary</Badge>} {index > 0 && p.enabled && <Badge>Fallback {index}</Badge>} {!p.enabled && <Badge>Disabled</Badge>}
              </div>
              <div className="mt-0.5 font-mono text-xs text-muted">{p.keyMask}{p.baseUrl ? ` · ${p.baseUrl}` : ""}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {(["fast", "reasoning", "large"] as const).map((t) => <span key={t} className="rounded-md bg-canvas px-2 py-0.5 text-muted ring-1 ring-line"><span className="font-medium text-ink">{t}</span> {p.models[t]}</span>)}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="ghost" aria-label="Move up" disabled={index === 0 || !!busy} onClick={() => move(-1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" aria-label="Move down" disabled={index === count - 1 || !!busy} onClick={() => move(1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" loading={busy === "test"} onClick={() => act("test", async () => {
                onOwl({ mood: "sparkle", tone: "working", text: `Testing ${p.label}…` });
                const r = await apiFetch<TestResult>(`/api/ai/providers/${p.id}/test`, { body: {} });
                setTest(r);
                onOwl(r.ok ? { mood: "delighted", tone: "success", text: `${p.label} is healthy — ${r.latencyMs} ms.` } : { mood: "dizzy", tone: "error", text: `${p.label} failed: ${r.message}` });
              })}>Test</Button>
              <Button size="sm" variant="ghost" loading={busy === "toggle"} onClick={() => act("toggle", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "PATCH", body: { enabled: !p.enabled } }); onChange(); })}>{p.enabled ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="ghost" aria-label="Delete" loading={busy === "delete"} onClick={() => confirm(`Delete ${p.label} and its stored key?`) && act("delete", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "DELETE" }); onChange(); })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
        {test && <TestBadge r={test} />}
        {canManage && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Replace API key</summary>
            <div className="mt-2 flex gap-2">
              <Input type="password" autoComplete="off" className="max-w-xs" placeholder="New key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              <Button size="sm" variant="outline" disabled={!newKey} loading={busy === "rotate"} onClick={() => act("rotate", async () => { await apiFetch(`/api/ai/providers/${p.id}`, { method: "PATCH", body: { apiKey: newKey } }); setNewKey(""); setTest(null); onChange(); })}>Replace</Button>
            </div>
          </details>
        )}
        <ErrorNote error={err} />
      </CardBody>
    </Card>
  );
}
