import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AIGateway } from "./gateway";
import { AIProviderError, AIUnavailableError, type ProviderAdapter, type ProviderKind, type ResolvedProvider } from "./types";

const provider = (id: string, kind: ProviderKind): ResolvedProvider => ({
  id, kind, label: id, models: { fast: "f", reasoning: "r", large: "l" }, credentials: { apiKey: "k" },
});
const schema = z.object({ answer: z.number() });
const call = { organizationId: "o", userId: "u" };
const req = { agent: "test", tier: "reasoning" as const, system: "s", prompt: "p", schema, context: call };

function adapter(responses: (string | Error)[]): ProviderAdapter & { calls: number } {
  const a = {
    kind: "openai" as const,
    calls: 0,
    async complete() {
      const r = responses[Math.min(a.calls++, responses.length - 1)]!;
      if (r instanceof Error) throw r;
      return { text: r, inputTokens: 10, outputTokens: 5, model: "m" };
    },
  };
  return a;
}

describe("AIGateway", () => {
  it("returns schema-validated data and meters usage", async () => {
    const usage = vi.fn();
    const a = adapter(['```json\n{"answer": 42}\n```']);
    const g = new AIGateway({ providers: [provider("p1", "openai")], adapterFor: () => a, recordUsage: usage, backoffMs: 1 });
    const res = await g.generateStructured(req);
    expect(res.data.answer).toBe(42);
    expect(usage).toHaveBeenCalledWith(expect.objectContaining({ inputTokens: 10, success: true, agent: "test" }));
  });

  it("repairs invalid output once", async () => {
    const a = adapter(['{"answer": "nope"}', '{"answer": 7}']);
    const g = new AIGateway({ providers: [provider("p1", "openai")], adapterFor: () => a, backoffMs: 1 });
    expect((await g.generateStructured(req)).data.answer).toBe(7);
    expect(a.calls).toBe(2);
  });

  it("retries retryable errors then falls back to the next provider", async () => {
    const failing = adapter([new AIProviderError("overloaded", "openai", 529, true)]);
    const backup = adapter(['{"answer": 1}']);
    const g = new AIGateway({
      providers: [provider("p1", "openai"), provider("p2", "anthropic")],
      adapterFor: (k) => (k === "openai" ? failing : backup),
      retriesPerProvider: 2,
      backoffMs: 1,
    });
    expect((await g.generateStructured(req)).provider).toBe("p2");
    expect(failing.calls).toBe(3);
  });

  it("does not retry auth errors and reports unavailability without losing context", async () => {
    const a = adapter([new AIProviderError("bad key", "openai", 401, false)]);
    const g = new AIGateway({ providers: [provider("p1", "openai")], adapterFor: () => a, backoffMs: 1 });
    await expect(g.generateStructured(req)).rejects.toBeInstanceOf(AIUnavailableError);
    expect(a.calls).toBe(1);
  });

  it("fails clearly when no provider is configured", async () => {
    await expect(new AIGateway({ providers: [] }).generateStructured(req)).rejects.toThrow(/No AI provider/);
  });
});
