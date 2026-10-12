import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import { createProvider, gatewayFor, listProviders, runProviderTest, updateProvider } from "./providers";

describe("provider preference", () => {
  beforeEach(() => setStore(new MemoryStore(undefined, true)));

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

describe("editing a provider", () => {
  beforeEach(() => setStore(new MemoryStore(undefined, true)));

  it("tests unsaved edits with the stored key, then saves them without touching the key", async () => {
    const p = await createProvider("o1", "u", { kind: "custom", apiKey: "sk-original-key-123", baseUrl: "https://a.example.com/v1", models: { reasoning: "old-model" } });
    const calls: { host: string; model: string; auth: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
      calls.push({ host: new URL(url).host, model: JSON.parse(init.body).model, auth: init.headers.authorization ?? "" });
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    }));
    const r = await runProviderTest("o1", p.id, { models: { reasoning: "new-model", fast: "new-model" }, baseUrl: "https://b.example.com/v1" });
    expect(r.ok).toBe(true);
    expect(calls[0]).toEqual({ host: "b.example.com", model: "new-model", auth: "Bearer sk-original-key-123" });
    // Testing edits does not save them.
    expect((await listProviders("o1"))[0]!.models.reasoning).toBe("old-model");

    const saved = await updateProvider("o1", p.id, { label: "Team gateway", models: { reasoning: "new-model" }, baseUrl: "https://b.example.com/v1" });
    expect(saved).toMatchObject({ label: "Team gateway", baseUrl: "https://b.example.com/v1", keyMask: p.keyMask });
    expect(saved.models.reasoning).toBe("new-model");
    await runProviderTest("o1", p.id);
    expect(calls.at(-1)!.auth).toBe("Bearer sk-original-key-123");
    vi.unstubAllGlobals();
  });
});
