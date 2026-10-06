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
    const msg = err instanceof Error ? err.message : String(err);
    throw new AIProviderError(`Network error contacting ${provider}: ${msg}`, provider, undefined, true);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new AIProviderError(
      `${provider} returned ${res.status}: ${extractError(text)}`,
      provider,
      res.status,
      RETRYABLE.has(res.status),
    );
  }
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
