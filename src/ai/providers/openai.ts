import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderCredentials, ProviderKind } from "../types";
import { AIProviderError } from "../types";
import { postJson } from "./http";

interface OpenAIChatResponse {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
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
        body.max_completion_tokens = req.maxTokens;
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
      const text = json.choices?.[0]?.message?.content ?? "";
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
