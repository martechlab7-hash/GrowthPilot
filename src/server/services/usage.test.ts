import { describe, expect, it } from "vitest";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import { assertAiQuota, PLAN_LIMITS, planLimits, recordUsage } from "./usage";

describe("daily AI allowance", () => {
  it("counts only answered requests and explains the limit", async () => {
    setStore(new MemoryStore(undefined, true));
    const base = { organizationId: "o", userId: "u", agent: "a", providerId: "p", provider: "gemini" as const, model: "m", inputTokens: 0, outputTokens: 0, costUsd: null, latencyMs: 1, createdAt: new Date().toISOString() };
    for (let i = 0; i < PLAN_LIMITS.free.aiRequestsPerDay + 5; i++) await recordUsage({ ...base, success: false, error: "429 quota" });
    await expect(assertAiQuota("o", "free")).resolves.toBeUndefined();
    for (let i = 0; i < PLAN_LIMITS.free.aiRequestsPerDay; i++) await recordUsage({ ...base, success: true });
    await expect(assertAiQuota("o", "free")).rejects.toThrow(/all \d+ AI requests included in the free plan today.*Settings → AI usage/);
  });
});

describe("deployment overrides", () => {
  it("lets a deployment raise or remove the limits", () => {
    expect(planLimits("free").aiRequestsPerDay).toBe(PLAN_LIMITS.free.aiRequestsPerDay);
    process.env.AI_DAILY_REQUEST_LIMIT = "2000";
    process.env.MAX_ACTIVE_CASES = "0";
    expect(planLimits("free")).toEqual({ aiRequestsPerDay: 2000, activeCases: Number.POSITIVE_INFINITY });
    process.env.AI_DAILY_REQUEST_LIMIT = "nonsense";
    expect(planLimits("free").aiRequestsPerDay).toBe(PLAN_LIMITS.free.aiRequestsPerDay);
    delete process.env.AI_DAILY_REQUEST_LIMIT;
    delete process.env.MAX_ACTIVE_CASES;
  });
});
