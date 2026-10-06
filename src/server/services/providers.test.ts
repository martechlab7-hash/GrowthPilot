import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import { createProvider, gatewayFor } from "./providers";

describe("provider preference", () => {
  beforeEach(() => setStore(new MemoryStore()));

  it("runs the chosen provider/model first and keeps the rest as fallbacks", async () => {
    const a = await createProvider("o1", "u", { kind: "custom", apiKey: "sk-aaaaaaaaaaaa", baseUrl: "https://a.example.com/v1", models: { reasoning: "model-a" } });
    const b = await createProvider("o1", "u", { kind: "custom", apiKey: "sk-bbbbbbbbbbbb", baseUrl: "https://b.example.com/v1", models: { reasoning: "model-b" } });
    expect(a.label).toBe("a.example.com");

    const seen: string[] = [];
    const fetchMock = vi.fn(async (url: string, init: { body: string }) => {
      seen.push(`${new URL(url).host}:${JSON.parse(init.body).model}`);
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"x":1}' } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { z } = await import("zod");
    const run = async (pref?: { providerId: string; model?: string }) => {
      const g = await gatewayFor("o1", pref);
      await g.generateStructured({ agent: "t", tier: "reasoning", system: "s", prompt: "p", schema: z.object({ x: z.number() }), context: { organizationId: "o1", userId: "u" } });
    };
    await run();
    await run({ providerId: b.id });
    await run({ providerId: b.id, model: "override-model" });
    await run({ providerId: "unknown" });
    vi.unstubAllGlobals();
    expect(seen).toEqual(["a.example.com:model-a", "b.example.com:model-b", "b.example.com:override-model", "a.example.com:model-a"]);
  });
});
