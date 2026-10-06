import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderCredentials, ProviderKind } from "../types";
import { AIProviderError } from "../types";
import { postJson } from "./http";

interface OpenAIChatResponse {
  model?: string;
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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
      } else {
        // Broadest compatibility across OpenAI-compatible servers.
        body.max_tokens = req.maxTokens;
      }
      const json = (await postJson(
        kind,
        `${base}/chat/completions`,
        { authorization: `Bearer ${creds.apiKey}` },
        body,
        req.timeoutMs,
      )) as OpenAIChatResponse;
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
export const customAdapter = build("custom", undefined);
