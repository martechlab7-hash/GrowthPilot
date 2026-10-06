import { AIProviderError, type ChatRequest, type ChatResponse, type ProviderAdapter, type ProviderCredentials } from "../types";
import { postJson } from "./http";

interface GeminiResponse {
  modelVersion?: string;
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

export const geminiAdapter: ProviderAdapter = {
  kind: "gemini",
  async complete(req: ChatRequest, creds: ProviderCredentials): Promise<ChatResponse> {
    // Gemini 2.5+ "thinking" tokens count against maxOutputTokens; without
    // headroom a long analysis returns empty or truncated JSON.
    const thinking = /gemini-(2\.5|[3-9])/.test(req.model);
    const budget = /gemini-2\.5/.test(req.model) ? { thinkingConfig: { thinkingBudget: req.maxTokens <= 2_000 ? 1_024 : 4_096 } } : {};
    const base = (creds.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
    const json = (await postJson(
      "gemini",
      `${base}/models/${encodeURIComponent(req.model)}:generateContent`,
      { "x-goog-api-key": creds.apiKey },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: thinking ? req.maxTokens + 16_384 : req.maxTokens,
          ...budget,
          ...(req.json ? { responseMimeType: "application/json" } : {}),
        },
      },
      req.timeoutMs,
    )) as GeminiResponse;
    const candidate = json.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
    if (json.promptFeedback?.blockReason) {
      throw new AIProviderError(`Gemini blocked the request (${json.promptFeedback.blockReason}).`, "gemini", 200, false);
    }
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new AIProviderError(`Gemini ran out of output tokens before finishing (model ${req.model}). Try a faster model for this tier or retry.`, "gemini", 200, true);
    }
    if (!text.trim()) {
      throw new AIProviderError(`Gemini returned an empty response (finishReason: ${candidate?.finishReason ?? "none"}).`, "gemini", 200, candidate?.finishReason !== "SAFETY");
    }
    return {
      text,
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: (json.usageMetadata?.candidatesTokenCount ?? 0) + (json.usageMetadata?.thoughtsTokenCount ?? 0),
      model: json.modelVersion ?? req.model,
    };
  },
};
