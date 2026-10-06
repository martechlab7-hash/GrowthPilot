import type { ChatRequest, ChatResponse, ProviderAdapter, ProviderCredentials } from "../types";
import { postJson } from "./http";

interface GeminiResponse {
  modelVersion?: string;
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export const geminiAdapter: ProviderAdapter = {
  kind: "gemini",
  async complete(req: ChatRequest, creds: ProviderCredentials): Promise<ChatResponse> {
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
          maxOutputTokens: req.maxTokens,
          ...(req.json ? { responseMimeType: "application/json" } : {}),
        },
      },
      req.timeoutMs,
    )) as GeminiResponse;
    const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return {
      text,
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      model: json.modelVersion ?? req.model,
    };
  },
};
