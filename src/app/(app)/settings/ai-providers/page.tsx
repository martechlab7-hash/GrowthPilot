"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, KeyRound, Plus, Trash2 } from "lucide-react";
import type { PublicProvider } from "@/server/services/providers";
import { ProviderWizard, TestBadge, type TestResult } from "@/components/settings/ProviderWizard";
import { KeyGuideButton } from "@/components/settings/KeyGuide";
import { Badge, Button, Card, CardBody, ErrorNote, Input, Label, Spinner } from "@/components/ui";
import { OwlSays, type MascotMood } from "@/components/mascot";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";
import { cn } from "@/lib/cn";

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
          <div className="flex flex-wrap items-center gap-2">
            <KeyGuideButton kind="openrouter" />
            {canManage && !adding && (
              <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button>
            )}
          </div>
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
