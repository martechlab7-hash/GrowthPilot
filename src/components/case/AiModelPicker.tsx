"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import type { PublicProvider } from "@/server/services/providers";
import { apiFetch } from "@/lib/client/api";
import { getAiPreference, setAiPreference } from "@/lib/client/aiPreference";

const AUTO = "auto";

/** Choose which configured provider/model runs the analysis (others stay as fallbacks). */
export function AiModelPicker() {
  const [providers, setProviders] = useState<PublicProvider[] | null>(null);
  const [value, setValue] = useState<string>(AUTO);

  useEffect(() => {
    apiFetch<{ providers: PublicProvider[] }>("/api/ai/providers")
      .then((r) => {
        const enabled = r.providers.filter((p) => p.enabled);
        setProviders(enabled);
        const pref = getAiPreference();
        if (pref && enabled.some((p) => p.id === pref.providerId)) setValue(JSON.stringify(pref));
        else if (pref) setAiPreference(null); // provider was deleted or disabled
      })
      .catch(() => setProviders([]));
  }, []);

  if (providers && providers.length === 0) {
    return (
      <Link href="/settings/ai-providers" className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
        <Cpu className="h-4 w-4" /> Add an AI provider
      </Link>
    );
  }

  const options: { value: string; label: string }[] = [{ value: AUTO, label: "Automatic (provider priority order)" }];
  for (const p of providers ?? []) {
    options.push({ value: JSON.stringify({ providerId: p.id }), label: `${p.label} — default models` });
    for (const m of [...new Set([p.models.fast, p.models.reasoning, p.models.large])]) {
      options.push({ value: JSON.stringify({ providerId: p.id, model: m }), label: `${p.label} — ${m}` });
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Cpu className="h-4 w-4 text-muted" aria-hidden />
      <span className="text-muted">AI model</span>
      <select
        className="h-9 max-w-[320px] rounded-lg border border-line bg-white px-2 text-sm"
        value={value}
        disabled={!providers}
        onChange={(e) => {
          setValue(e.target.value);
          setAiPreference(e.target.value === AUTO ? null : JSON.parse(e.target.value));
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
