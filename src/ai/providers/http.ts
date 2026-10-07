import { AIProviderError, type ProviderKind } from "../types";

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

export async function postJson(
  provider: ProviderKind,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 120_000,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    // A timeout means the model is slow right now; retrying the same model rarely helps,
    // so it is not retried and the gateway moves straight to the fallback provider.
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new AIProviderError(
        `${provider} did not respond within ${Math.round(timeoutMs / 1000)}s. Very large or free models are often slow under load: pick a faster model for this tier, or move a faster provider to the top in Settings → AI providers.`,
        provider, undefined, false, "timeout",
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new AIProviderError(`Network error contacting ${provider}: ${msg}`, provider, undefined, true);
  }
  const text = await res.text();
  if (!res.ok) throw classifyHttpError(provider, res.status, extractError(text));
  try {
    return JSON.parse(text);
  } catch {
    throw new AIProviderError(`${provider} returned a non-JSON response`, provider, res.status, true);
  }
}

function extractError(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof j.error === "string") return j.error;
    return j.error?.message ?? j.message ?? text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

const NAMES: Record<ProviderKind, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", openrouter: "OpenRouter", custom: "The custom provider" };

/**
 * Turn a provider's HTTP error into a message a marketer can act on, and
 * decide whether retrying can help. Running out of quota or credits looks like
 * a rate limit (429) but never clears within a retry, so it is not retried.
 */
export function classifyHttpError(provider: ProviderKind, status: number, raw: string): AIProviderError {
  const name = NAMES[provider];
  const detail = raw.replace(/\s+/g, " ").trim().slice(0, 220);
  const quota = /quota|insufficient_quota|billing|credit|exceeded your current|resource.?exhausted|payment required|out of (credits|funds)/i.test(raw);
  if (status === 402 || (status === 429 && quota)) {
    const fix =
      provider === "gemini" ? "On Google's free tier this usually resets daily or per minute; enable billing in Google AI Studio for higher limits."
      : provider === "openrouter" ? "Add credits at openrouter.ai/credits (free models have their own daily limits)."
      : "Add credits or raise the spending limit in the provider's console.";
    return new AIProviderError(`${name} quota or credits are used up. ${fix} Meanwhile GrowthPilot uses your next provider. (${detail})`, provider, status, false, "quota");
  }
  if (status === 401 || status === 403) {
    return new AIProviderError(`${name} rejected the API key (${status}). Check or replace it in Settings → AI providers. (${detail})`, provider, status, false, "auth");
  }
  if (status === 404) {
    return new AIProviderError(`${name} could not find this model for your key (404). Check the model name in Settings → AI providers. (${detail})`, provider, status, false, "model");
  }
  if (status === 429) {
    return new AIProviderError(`${name} is rate-limiting requests right now (429). (${detail})`, provider, status, true, "rate_limit");
  }
  return new AIProviderError(`${name} returned ${status}: ${detail}`, provider, status, RETRYABLE.has(status));
}
