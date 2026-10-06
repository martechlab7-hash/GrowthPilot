import "server-only";
import { z } from "zod";
import { AIGateway, testProvider } from "@/ai/gateway";
import {
  DEFAULT_MODELS,
  ModelMapSchema,
  PROVIDER_LABELS,
  ProviderKindSchema,
  type ModelMap,
  type ProviderKind,
  type ResolvedProvider,
} from "@/ai/types";
import { decryptSecret, encryptSecret, maskKey, type EncryptedSecret } from "../crypto";
import { env } from "../env";
import { badRequest, notFound } from "../errors";
import { log } from "../logger";
import { getStore } from "../store";
import { recordUsage } from "./usage";

export interface AiProviderRecord {
  id: string;
  organizationId: string;
  kind: ProviderKind;
  label: string;
  baseUrl?: string;
  models: ModelMap;
  encryptedKey: EncryptedSecret;
  keyMask: string;
  enabled: boolean;
  /** Lower runs first; the first enabled provider is the primary. */
  priority: number;
  costPer1MInput?: number;
  costPer1MOutput?: number;
  lastTest?: { ok: boolean; latencyMs: number; message: string; model: string; at: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** What the browser is allowed to see — never the key. */
export type PublicProvider = Omit<AiProviderRecord, "encryptedKey">;

export const ProviderInputSchema = z.object({
  kind: ProviderKindSchema,
  label: z.string().max(80).optional(),
  apiKey: z.string().min(8).max(500).optional(),
  baseUrl: z.string().url().max(300).optional().or(z.literal("")),
  models: ModelMapSchema.partial().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  costPer1MInput: z.number().min(0).max(10_000).optional(),
  costPer1MOutput: z.number().min(0).max(10_000).optional(),
});
export type ProviderInput = z.infer<typeof ProviderInputSchema>;

const col = () => getStore().collection<AiProviderRecord>("ai_providers");

export function toPublic(p: AiProviderRecord): PublicProvider {
  const { encryptedKey: _secret, ...rest } = p;
  void _secret;
  return rest;
}

export async function listProviders(orgId: string): Promise<AiProviderRecord[]> {
  const rows = await col().query({ where: [["organizationId", "==", orgId]] });
  return rows.sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
}

function validateBaseUrl(kind: ProviderKind, baseUrl: string | undefined) {
  if (kind === "custom" && !baseUrl) throw badRequest("Base URL is required for custom providers");
  if (baseUrl && !baseUrl.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)) {
    throw badRequest("Base URL must use https");
  }
}

function resolveModels(kind: ProviderKind, models: Partial<ModelMap> | undefined, current?: ModelMap): ModelMap {
  const merged = { ...DEFAULT_MODELS[kind], ...current, ...stripEmpty(models) };
  if (!merged.reasoning) throw badRequest("A reasoning model is required");
  return {
    fast: merged.fast || merged.reasoning,
    reasoning: merged.reasoning,
    large: merged.large || merged.reasoning,
  };
}

function stripEmpty(m: Partial<ModelMap> | undefined): Partial<ModelMap> {
  return Object.fromEntries(Object.entries(m ?? {}).filter(([, v]) => !!v)) as Partial<ModelMap>;
}

export async function createProvider(orgId: string, uid: string, input: ProviderInput): Promise<PublicProvider> {
  if (!input.apiKey) throw badRequest("API key is required");
  const baseUrl = input.baseUrl || undefined;
  validateBaseUrl(input.kind, baseUrl);
  const existing = await listProviders(orgId);
  const now = new Date().toISOString();
  const rec: AiProviderRecord = {
    id: `prv_${crypto.randomUUID().slice(0, 12)}`,
    organizationId: orgId,
    kind: input.kind,
    label: input.label || PROVIDER_LABELS[input.kind],
    ...(baseUrl ? { baseUrl } : {}),
    models: resolveModels(input.kind, input.models),
    encryptedKey: encryptSecret(input.apiKey.trim()),
    keyMask: maskKey(input.apiKey.trim()),
    enabled: input.enabled ?? true,
    priority: input.priority ?? existing.length,
    ...(input.costPer1MInput !== undefined ? { costPer1MInput: input.costPer1MInput } : {}),
    ...(input.costPer1MOutput !== undefined ? { costPer1MOutput: input.costPer1MOutput } : {}),
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };
  await col().set(rec);
  return toPublic(rec);
}

export async function updateProvider(orgId: string, id: string, input: Partial<ProviderInput>): Promise<PublicProvider> {
  const current = await col().get(id);
  if (!current || current.organizationId !== orgId) throw notFound("Provider");
  const baseUrl = input.baseUrl === "" ? undefined : (input.baseUrl ?? current.baseUrl);
  validateBaseUrl(current.kind, baseUrl);
  const next: AiProviderRecord = {
    ...current,
    label: input.label ?? current.label,
    models: resolveModels(current.kind, input.models, current.models),
    enabled: input.enabled ?? current.enabled,
    priority: input.priority ?? current.priority,
    updatedAt: new Date().toISOString(),
  };
  if (baseUrl) next.baseUrl = baseUrl;
  else delete next.baseUrl;
  if (input.costPer1MInput !== undefined) next.costPer1MInput = input.costPer1MInput;
  if (input.costPer1MOutput !== undefined) next.costPer1MOutput = input.costPer1MOutput;
  if (input.apiKey) {
    next.encryptedKey = encryptSecret(input.apiKey.trim());
    next.keyMask = maskKey(input.apiKey.trim());
    delete next.lastTest;
  }
  await col().set(next);
  return toPublic(next);
}

export async function deleteProvider(orgId: string, id: string) {
  const current = await col().get(id);
  if (!current || current.organizationId !== orgId) throw notFound("Provider");
  await col().delete(id);
}

function resolve(p: AiProviderRecord): ResolvedProvider {
  return {
    id: p.id,
    kind: p.kind,
    label: p.label,
    models: p.models,
    credentials: { apiKey: decryptSecret(p.encryptedKey), ...(p.baseUrl ? { baseUrl: p.baseUrl } : {}) },
    ...(p.costPer1MInput !== undefined ? { costPer1MInput: p.costPer1MInput } : {}),
    ...(p.costPer1MOutput !== undefined ? { costPer1MOutput: p.costPer1MOutput } : {}),
  };
}

/** Decrypted, ordered provider chain for the gateway. Server-side only. */
export async function resolveProviders(orgId: string): Promise<ResolvedProvider[]> {
  const out: ResolvedProvider[] = [];
  for (const p of await listProviders(orgId)) {
    if (!p.enabled) continue;
    try {
      out.push(resolve(p));
    } catch (err) {
      log("error", "provider.decrypt_failed", { orgId, providerId: p.id, message: (err as Error).message });
    }
  }
  if (!out.length && env.platformProvider && env.platformApiKey) {
    out.push({
      id: "platform",
      kind: env.platformProvider,
      label: `Platform ${PROVIDER_LABELS[env.platformProvider]}`,
      models: DEFAULT_MODELS[env.platformProvider],
      credentials: { apiKey: env.platformApiKey },
    });
  }
  return out;
}

export async function gatewayFor(orgId: string): Promise<AIGateway> {
  return new AIGateway({
    providers: await resolveProviders(orgId),
    recordUsage,
    log: (event, data) => log("warn", event, { orgId, ...data }),
  });
}

export async function runProviderTest(orgId: string, id: string) {
  const current = await col().get(id);
  if (!current || current.organizationId !== orgId) throw notFound("Provider");
  const result = await testProvider(resolve(current));
  await col().update(id, { lastTest: { ...result, at: new Date().toISOString() } });
  return result;
}

/** Test credentials before saving them. Nothing is persisted. */
export async function runAdHocTest(input: ProviderInput) {
  if (!input.apiKey) throw badRequest("API key is required");
  const baseUrl = input.baseUrl || undefined;
  validateBaseUrl(input.kind, baseUrl);
  return testProvider({
    id: "adhoc",
    kind: input.kind,
    label: PROVIDER_LABELS[input.kind],
    models: resolveModels(input.kind, input.models),
    credentials: { apiKey: input.apiKey.trim(), ...(baseUrl ? { baseUrl } : {}) },
  });
}
