import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderCredentials, ProviderKind } from "../types";
import { AIProviderError } from "../types";
import { postJson } from "./http";

interface OpenAIChatResponse {
  model?: string;
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: number | string };
}

function build(kind: ProviderKind, defaultBase: string | undefined): ProviderAdapter {
  return {
    kind,
    async complete(req: ChatRequest, creds: ProviderCredentials): Promise<ChatResponse> {
      const base = (creds.baseUrl ?? defaultBase ?? "").replace(/\/+$/, "");
      if (!base) throw new AIProviderError("Base URL is required", kind, undefined, false);
      const body: Record<string, unknown> = {
        model: req.model,
        messages: [{ role: "system", content: req.system }, ...req.messages],
      };
      if (kind === "openai") {
        // Reasoning models (gpt-5, o-series) spend hidden reasoning tokens from this budget.
        body.max_completion_tokens = /^(gpt-5|o\d)/.test(req.model) ? req.maxTokens + 16_000 : req.maxTokens;
        if (req.json) body.response_format = { type: "json_object" };
      } else if (kind === "openrouter") {
        // OpenRouter normalises response_format across providers; reasoning models
        // (GPT-5, o-series, Gemini 2.5+, "thinking" variants) need output headroom.
        body.max_tokens = /(gpt-5|\/o\d|gemini-(2\.5|[3-9])|thinking|reasoner|r1)/i.test(req.model) ? req.maxTokens + 16_000 : req.maxTokens;
        if (req.json) body.response_format = { type: "json_object" };
      } else {
        // Broadest compatibility across OpenAI-compatible servers.
        body.max_tokens = req.maxTokens;
      }
      const headers: Record<string, string> = { authorization: `Bearer ${creds.apiKey}` };
      if (kind === "openrouter") {
        // Optional attribution headers recommended by OpenRouter.
        const site = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
        if (site) headers["HTTP-Referer"] = site;
        headers["X-Title"] = process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "GrowthPilot";
      }
      const json = (await postJson(
        kind,
        `${base}/chat/completions`,
        headers,
        body,
        req.timeoutMs,
      )) as OpenAIChatResponse;
      if (json.error) {
        const code = typeof json.error.code === "number" ? json.error.code : undefined;
        throw new AIProviderError(`${kind} error: ${json.error.message ?? "unknown"}`, kind, code, code === undefined || code === 429 || code >= 500);
      }
      const choice = json.choices?.[0];
      const text = choice?.message?.content ?? "";
      if (choice?.message?.refusal) throw new AIProviderError(`Model refused: ${choice.message.refusal.slice(0, 200)}`, kind, 200, false);
      if (!text.trim()) {
        throw new AIProviderError(
          choice?.finish_reason === "length" ? `Model ran out of output tokens before answering (${req.model}).` : `Model returned an empty response (finish_reason: ${choice?.finish_reason ?? "none"}).`,
          kind,
          200,
          true,
        );
      }
      return {
        text,
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        model: json.model ?? req.model,
      };
    },
  };
}

export const openaiAdapter = build("openai", "https://api.openai.com/v1");
export const openrouterAdapter = build("openrouter", "https://openrouter.ai/api/v1");
export const customAdapter = build("custom", undefined);
