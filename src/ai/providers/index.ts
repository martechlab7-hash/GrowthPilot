import type { ProviderAdapter, ProviderKind } from "../types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { customAdapter, openaiAdapter } from "./openai";

const ADAPTERS: Record<ProviderKind, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  custom: customAdapter,
};

export function getAdapter(kind: ProviderKind): ProviderAdapter {
  return ADAPTERS[kind];
}
