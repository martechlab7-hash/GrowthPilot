"use client";

/** The provider/model the user chose for AI runs; sent with every API call. */
export interface AiPreference {
  providerId: string;
  model?: string;
}

const KEY = "gp-ai-preference";

export function getAiPreference(): AiPreference | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AiPreference) : null;
  } catch {
    return null;
  }
}

export function setAiPreference(p: AiPreference | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: preference applies to this page only */
  }
}

export function aiPreferenceHeaders(): Record<string, string> {
  const p = getAiPreference();
  if (!p) return {};
  return { "x-ai-provider": p.providerId, ...(p.model ? { "x-ai-model": p.model } : {}) };
}
