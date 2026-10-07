"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { DEFAULT_MODELS, PROVIDER_KINDS, PROVIDER_LABELS, type ModelMap, type ProviderKind } from "@/ai/types";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "@/components/ui";
import type { MascotMood } from "@/components/mascot";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { KeyGuideButton } from "./KeyGuide";

export type TestResult = { ok: boolean; latencyMs: number; model: string; message: string };

export const PROVIDER_INFO: Record<ProviderKind, { blurb: string; keyUrl?: string; keyHint: string }> = {
  openai: { blurb: "GPT models from OpenAI.", keyUrl: "https://platform.openai.com/api-keys", keyHint: "Starts with sk-" },
  anthropic: { blurb: "Claude models from Anthropic.", keyUrl: "https://console.anthropic.com/settings/keys", keyHint: "Starts with sk-ant-" },
  gemini: { blurb: "Gemini models from Google AI Studio.", keyUrl: "https://aistudio.google.com/apikey", keyHint: "From Google AI Studio" },
  openrouter: { blurb: "One key, hundreds of models from every vendor.", keyUrl: "https://openrouter.ai/keys", keyHint: "Starts with sk-or-" },
  custom: { blurb: "Any OpenAI-compatible endpoint (Azure, Groq, Together, local…).", keyHint: "Your endpoint's API key" },
};

export function TestBadge({ r }: { r: TestResult }) {
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

export type OwlMessage = { mood: MascotMood | null; tone: "default" | "success" | "error" | "working"; text: string };

/** Add-a-provider wizard, used in Settings and during onboarding. */
export function ProviderWizard({ onDone, onOwl, cancelLabel = "Cancel" }: { onDone: (saved: boolean) => void; onOwl?: (o: OwlMessage | null) => void; cancelLabel?: string }) {
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
    onOwl?.({ mood: "sparkle", tone: "working", text: "Let me knock on the door… sending a tiny test request." });
    try {
      const r = await apiFetch<TestResult>("/api/ai/test-provider", { body: body() });
      setTest(r);
      onOwl?.(r.ok
        ? { mood: "delighted", tone: "success", text: `It works! ${r.model} answered in ${r.latencyMs} ms. Save it and I'm ready to go.` }
        : { mood: "dizzy", tone: "error", text: `That didn't work: ${r.message}. Check the key and model names.` });
    } catch (e) {
      setErr((e as Error).message);
      onOwl?.({ mood: "dizzy", tone: "error", text: "Something went wrong while testing. Details are below the form." });
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
                onClick={() => { setKind(k); setModels(DEFAULT_MODELS[k]); setTest(null); onOwl?.(null); }}
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
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="key" className="text-sm font-medium text-ink">API key <span className="font-normal text-muted">({info.keyHint})</span></label>
                <KeyGuideButton kind={kind} />
              </div>
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
                onDone(true);
              } catch (e) {
                setErr((e as Error).message);
                setBusy(null);
              }
            }}>Save provider</Button>
            <Button variant="ghost" onClick={() => onDone(false)}>{cancelLabel}</Button>
          </div>
        </Step>
      </CardBody>
    </Card>
  );
}

