import { z } from "zod";

export const PROVIDER_KINDS = ["openai", "anthropic", "gemini", "openrouter", "custom"] as const;
export const ProviderKindSchema = z.enum(PROVIDER_KINDS);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

/** Model routing tiers (spec §63). */
export const MODEL_TIERS = ["fast", "reasoning", "large"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

export const ModelMapSchema = z.object({
  fast: z.string().min(1).max(120),
  reasoning: z.string().min(1).max(120),
  large: z.string().min(1).max(120),
});
export type ModelMap = z.infer<typeof ModelMapSchema>;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  model: string;
  json: boolean;
  maxTokens: number;
  timeoutMs?: number;
}

export interface ChatResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ProviderCredentials {
  apiKey: string;
  baseUrl?: string;
}

export interface ProviderAdapter {
  kind: ProviderKind;
  complete(req: ChatRequest, creds: ProviderCredentials): Promise<ChatResponse>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderKind,
    readonly status: number | undefined,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIUnavailableError extends Error {
  constructor(message: string, readonly attempts: string[]) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export class AIOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIOutputError";
  }
}

export const DEFAULT_MODELS: Record<ProviderKind, ModelMap> = {
  openai: { fast: "gpt-5-mini", reasoning: "gpt-5", large: "gpt-5" },
  anthropic: { fast: "claude-haiku-4-5", reasoning: "claude-sonnet-5-5", large: "claude-opus-5-5" },
  gemini: { fast: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", large: "gemini-2.5-pro" },
  // OpenRouter model IDs are "vendor/model"; browse https://openrouter.ai/models.
  openrouter: { fast: "google/gemini-2.5-flash", reasoning: "anthropic/claude-sonnet-4.5", large: "anthropic/claude-sonnet-4.5" },
  custom: { fast: "", reasoning: "", large: "" },
};

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  custom: "Custom (OpenAI-compatible)",
};

/** A provider ready for use: decrypted credentials, server-side only. */
export interface ResolvedProvider {
  id: string;
  kind: ProviderKind;
  label: string;
  models: ModelMap;
  credentials: ProviderCredentials;
  costPer1MInput?: number;
  costPer1MOutput?: number;
}

export interface UsageRecord {
  organizationId: string;
  userId: string;
  caseId?: string;
  agent: string;
  providerId: string;
  provider: ProviderKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  latencyMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}

/** Progress events emitted by the gateway so the UI can show what is happening. */
export type AIEvent =
  | { type: "attempt"; provider: string; model: string; attempt: number }
  | { type: "response"; provider: string; model: string; latencyMs: number; inputTokens: number; outputTokens: number }
  | { type: "repair"; provider: string; model: string; reason: string }
  | { type: "error"; provider: string; model: string; message: string; willRetry: boolean }
  | { type: "fallback"; from: string; to: string };
