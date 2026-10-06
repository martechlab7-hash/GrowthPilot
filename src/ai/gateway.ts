import type { z } from "zod";
import { getAdapter } from "./providers";
import { parseStructured, schemaForPrompt } from "./json";
import {
  AIOutputError,
  AIProviderError,
  AIUnavailableError,
  type ChatMessage,
  type ModelTier,
  type ProviderAdapter,
  type ProviderKind,
  type ResolvedProvider,
  type UsageRecord,
} from "./types";

export interface GatewayCallContext {
  organizationId: string;
  userId: string;
  caseId?: string;
}

export interface StructuredRequest<T extends z.ZodType> {
  agent: string;
  tier: ModelTier;
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
  context: GatewayCallContext;
}

export interface GatewayResult<T> {
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface GatewayOptions {
  providers: ResolvedProvider[];
  recordUsage?: (u: UsageRecord) => Promise<void> | void;
  /** Injectable for tests. */
  adapterFor?: (kind: ProviderKind) => ProviderAdapter;
  retriesPerProvider?: number;
  backoffMs?: number;
  log?: (event: string, data: Record<string, unknown>) => void;
}

const TIER_TOKENS: Record<ModelTier, number> = { fast: 2_000, reasoning: 8_000, large: 12_000 };
const TIER_TIMEOUT: Record<ModelTier, number> = { fast: 45_000, reasoning: 150_000, large: 240_000 };

/**
 * AI Gateway (spec §28, §63, §74). Routes a request to the organisation's
 * providers in priority order with retry → fallback provider → failure.
 * Every attempt is metered. Callers always receive schema-validated data.
 */
export class AIGateway {
  private readonly retries: number;
  private readonly backoff: number;

  constructor(private readonly opts: GatewayOptions) {
    this.retries = opts.retriesPerProvider ?? 2;
    this.backoff = opts.backoffMs ?? 600;
  }

  get hasProviders() {
    return this.opts.providers.length > 0;
  }

  async generateStructured<T extends z.ZodType>(req: StructuredRequest<T>): Promise<GatewayResult<z.infer<T>>> {
    if (!this.opts.providers.length) {
      throw new AIUnavailableError("No AI provider is configured for this organization.", []);
    }
    const attempts: string[] = [];
    const system = `${req.system}\n\nOUTPUT CONTRACT: Return ONLY a JSON object that validates against this JSON Schema:\n${schemaForPrompt(req.schema)}`;

    for (const provider of this.opts.providers) {
      const model = provider.models[req.tier] || provider.models.reasoning;
      if (!model) {
        attempts.push(`${provider.label}: no model configured for tier ${req.tier}`);
        continue;
      }
      const messages: ChatMessage[] = [{ role: "user", content: req.prompt }];
      let repaired = false;

      for (let attempt = 0; attempt <= this.retries; attempt++) {
        const started = Date.now();
        try {
          const res = await (this.opts.adapterFor ?? getAdapter)(provider.kind).complete(
            {
              system,
              messages,
              model,
              json: true,
              maxTokens: req.maxTokens ?? TIER_TOKENS[req.tier],
              timeoutMs: TIER_TIMEOUT[req.tier],
            },
            provider.credentials,
          );
          const latencyMs = Date.now() - started;
          await this.meter(req, provider, res.model, res.inputTokens, res.outputTokens, latencyMs, true);
          try {
            const data = parseStructured(res.text, req.schema);
            return { data, provider: provider.label, model: res.model, latencyMs };
          } catch (err) {
            if (!(err instanceof AIOutputError) || repaired) throw err;
            // One repair turn: show the model its own output and the validation error.
            repaired = true;
            messages.push({ role: "assistant", content: res.text.slice(0, 20_000) });
            messages.push({
              role: "user",
              content: `Your previous response was invalid: ${err.message}. Return the corrected JSON object only.`,
            });
            attempt--; // a repair does not consume a transport retry
            continue;
          }
        } catch (err) {
          const latencyMs = Date.now() - started;
          const message = err instanceof Error ? err.message : String(err);
          if (err instanceof AIProviderError) {
            await this.meter(req, provider, model, 0, 0, latencyMs, false, message);
          }
          attempts.push(`${provider.label} (${model}): ${message}`);
          this.opts.log?.("ai.attempt_failed", { agent: req.agent, provider: provider.kind, model, message });
          const retryable = err instanceof AIProviderError ? err.retryable : false;
          if (!retryable || attempt === this.retries) break;
          await sleep(this.backoff * 2 ** attempt);
        }
      }
    }
    throw new AIUnavailableError(
      "The strategy engine is temporarily unavailable. Your case has been saved and analysis can be resumed.",
      attempts,
    );
  }

  private async meter(
    req: StructuredRequest<z.ZodType>,
    provider: ResolvedProvider,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    success: boolean,
    error?: string,
  ) {
    if (!this.opts.recordUsage) return;
    const costUsd =
      provider.costPer1MInput !== undefined && provider.costPer1MOutput !== undefined
        ? (inputTokens * provider.costPer1MInput + outputTokens * provider.costPer1MOutput) / 1_000_000
        : null;
    try {
      await this.opts.recordUsage({
        organizationId: req.context.organizationId,
        userId: req.context.userId,
        caseId: req.context.caseId,
        agent: req.agent,
        providerId: provider.id,
        provider: provider.kind,
        model,
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
        success,
        ...(error ? { error: error.slice(0, 500) } : {}),
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Metering must never break the user's request.
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Lightweight connection test used by Settings → AI Providers. */
export async function testProvider(
  provider: ResolvedProvider,
  adapterFor: (kind: ProviderKind) => ProviderAdapter = getAdapter,
): Promise<{ ok: boolean; latencyMs: number; model: string; message: string }> {
  const model = provider.models.fast || provider.models.reasoning;
  const started = Date.now();
  try {
    const res = await adapterFor(provider.kind).complete(
      {
        system: "You are a connectivity check.",
        messages: [{ role: "user", content: 'Reply with the JSON object {"ok": true}.' }],
        model,
        json: true,
        maxTokens: 400,
        timeoutMs: 30_000,
      },
      provider.credentials,
    );
    return { ok: true, latencyMs: Date.now() - started, model: res.model, message: "Connection successful. Model available." };
  } catch (err) {
    const status = err instanceof AIProviderError ? err.status : undefined;
    const message =
      status === 401 || status === 403
        ? "Authentication failed"
        : status === 404
          ? `Model "${model}" not found or not available for this key`
          : err instanceof Error
            ? err.message
            : "Connection failed";
    return { ok: false, latencyMs: Date.now() - started, model, message };
  }
}
