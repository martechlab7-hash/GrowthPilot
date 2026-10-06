import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderCredentials } from "../types";
import { postJson } from "./http";

interface AnthropicResponse {
  model?: string;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export const anthropicAdapter: ProviderAdapter = {
  kind: "anthropic",
  async complete(req: ChatRequest, creds: ProviderCredentials): Promise<ChatResponse> {
    const base = (creds.baseUrl ?? "https://api.anthropic.com").replace(/\/+$/, "");
    const json = (await postJson(
      "anthropic",
      `${base}/v1/messages`,
      { "x-api-key": creds.apiKey, "anthropic-version": "2023-06-01" },
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.json
          ? `${req.system}\n\nRespond with a single valid JSON object only. No prose, no markdown fences.`
          : req.system,
        messages: req.messages,
      },
      req.timeoutMs,
    )) as AnthropicResponse;
    const text = (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return {
      text,
      inputTokens: json.usage?.input_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
      model: json.model ?? req.model,
    };
  },
};
