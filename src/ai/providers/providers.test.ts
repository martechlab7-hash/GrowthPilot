import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiAdapter } from "./gemini";
import { openaiAdapter } from "./openai";

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
