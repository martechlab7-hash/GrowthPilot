import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiAdapter } from "./gemini";
import { openaiAdapter, openrouterAdapter } from "./openai";

const creds = { apiKey: "k" };
const req = (model: string) => ({ system: "s", messages: [{ role: "user" as const, content: "p" }], model, json: true, maxTokens: 8000 });

function mockFetch(body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("gemini adapter", () => {
  it("adds thinking headroom for 2.5 models and ignores thought parts", async () => {
    const fetch = mockFetch({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "thinking…", thought: true }, { text: '{"a":1}' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, thoughtsTokenCount: 7 } });
    const res = await geminiAdapter.complete(req("gemini-2.5-pro"), creds);
    expect(res.text).toBe('{"a":1}');
    expect(res.outputTokens).toBe(10);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.generationConfig.maxOutputTokens).toBe(8000 + 16_384);
    expect(sent.generationConfig.thinkingConfig.thinkingBudget).toBe(4096);
  });

  it("explains truncation instead of failing silently", async () => {
    mockFetch({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"a":' }] } }] });
    await expect(geminiAdapter.complete(req("gemini-2.5-flash"), creds)).rejects.toThrow(/ran out of output tokens/);
  });

  it("reports empty responses with the finish reason", async () => {
    mockFetch({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] });
    await expect(geminiAdapter.complete(req("gemini-2.5-flash"), creds)).rejects.toThrow(/empty response \(finishReason: SAFETY\)/);
  });
});

describe("openai adapter", () => {
  it("adds reasoning headroom for gpt-5 and reports length truncation", async () => {
    const fetch = mockFetch({ choices: [{ finish_reason: "length", message: { content: "" } }] });
    await expect(openaiAdapter.complete(req("gpt-5"), creds)).rejects.toThrow(/ran out of output tokens/);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.max_completion_tokens).toBe(24_000);
  });
});

describe("openrouter adapter", () => {
  it("calls OpenRouter with JSON mode, attribution and reasoning headroom", async () => {
    const fetch = mockFetch({ model: "google/gemini-2.5-flash", choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 4, completion_tokens: 2 } });
    const res = await openrouterAdapter.complete(req("google/gemini-2.5-flash"), creds);
    expect(res.text).toBe('{"ok":true}');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers["X-Title"]).toBeTruthy();
    const sent = JSON.parse(init.body);
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(sent.max_tokens).toBe(24_000);
  });

  it("surfaces errors OpenRouter returns inside a 200 body", async () => {
    mockFetch({ error: { message: "No endpoints found for model x/y", code: 404 } });
    await expect(openrouterAdapter.complete(req("x/y"), creds)).rejects.toThrow(/No endpoints found/);
  });
});

describe("provider input validation", () => {
  it("accepts blank model fields (defaults fill them) instead of rejecting the form", async () => {
    const { ProviderInputSchema } = await import("@/server/services/providers");
    const parsed = ProviderInputSchema.parse({ kind: "custom", apiKey: "sk-or-v1-abcdefgh", baseUrl: "https://openrouter.ai/api/v1", models: { fast: "", reasoning: "google/gemini-2.5-flash", large: "" } });
    expect(parsed.models?.reasoning).toBe("google/gemini-2.5-flash");
  });
});

describe("images (vision)", () => {
  const withImage = (model: string) => ({ ...req(model), messages: [{ role: "user" as const, content: "review", images: [{ mediaType: "image/jpeg" as const, data: "AAAA" }] }] });

  it("sends OpenAI-compatible image_url parts", async () => {
    const fetch = mockFetch({ choices: [{ finish_reason: "stop", message: { content: '{"a":1}' } }] });
    await openrouterAdapter.complete(withImage("google/gemini-2.5-flash"), creds);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.messages[1].content).toEqual([{ type: "text", text: "review" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } }]);
  });

  it("sends Gemini inlineData parts", async () => {
    const fetch = mockFetch({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"a":1}' }] } }] });
    await geminiAdapter.complete(withImage("gemini-2.5-flash"), creds);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.contents[0].parts).toEqual([{ inlineData: { mimeType: "image/jpeg", data: "AAAA" } }, { text: "review" }]);
  });

  it("sends Anthropic base64 image blocks", async () => {
    const { anthropicAdapter } = await import("./anthropic");
    const fetch = mockFetch({ content: [{ type: "text", text: '{"a":1}' }] });
    await anthropicAdapter.complete(withImage("claude-haiku-4-5"), creds);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } });
    expect(sent.messages[0].content[1]).toEqual({ type: "text", text: "review" });
  });

  it("keeps plain string content when there are no images", async () => {
    const fetch = mockFetch({ choices: [{ finish_reason: "stop", message: { content: '{"a":1}' } }] });
    await openaiAdapter.complete(req("gpt-4.1"), creds);
    const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.messages[1]).toEqual({ role: "user", content: "p" });
  });
});
