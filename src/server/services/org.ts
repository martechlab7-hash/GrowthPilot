import "server-only";
import { z } from "zod";
import { DEFAULT_BRAND, BrandProfileSchema, type BrandProfile, type Organization, type UserProfile, type AuditLogEntry } from "@/domain/types";
import { badRequest, forbidden } from "../errors";
import { isValidPng } from "@/reports/brandAssets";
import { getStore } from "../store";
import type { AuthContext } from "../auth";
import { COLLECTIONS } from "../store/types";

export const BootstrapSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  displayName: z.string().trim().max(120).optional(),
});

type OrgDoc = Organization & { id: string };
type BrandDoc = BrandProfile & { id: string; organizationId: string; updatedAt: string; updatedBy: string };

export async function bootstrapAccount(auth: AuthContext, input: z.infer<typeof BootstrapSchema>) {
  if (auth.profile) return { organization: await getStore().collection<OrgDoc>("organizations").get(auth.profile.organizationId), profile: auth.profile };
  const now = new Date().toISOString();
  const org: OrgDoc = {
    id: `org_${crypto.randomUUID().slice(0, 12)}`,
    name: input.organizationName,
    plan: "free",
    createdBy: auth.uid,
    createdAt: now,
    updatedAt: now,
  };
  const profile: UserProfile = {
    id: auth.uid,
    organizationId: org.id,
    email: auth.email,
    displayName: input.displayName || auth.name,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  };
  await getStore().collection<OrgDoc>("organizations").set(org);
  await getStore().collection<UserProfile>("users").set(profile);
  await audit(org.id, auth.uid, "account.bootstrap", org.id);
  return { organization: org, profile };
}

export async function getMe(auth: AuthContext) {
  if (!auth.profile) return { onboarded: false as const, email: auth.email, name: auth.name };
  const organization = await getStore().collection<OrgDoc>("organizations").get(auth.orgId);
  return { onboarded: true as const, profile: auth.profile, organization };
}

export async function audit(orgId: string, actorId: string, action: string, target: string, metadata?: Record<string, unknown>) {
  const entry: AuditLogEntry = {
    id: `aud_${crypto.randomUUID()}`,
    organizationId: orgId,
    actorId,
    action,
    target,
    ...(metadata ? { metadata } : {}),
    createdAt: new Date().toISOString(),
  };
  await getStore().collection<AuditLogEntry>("audit_logs").set(entry);
}

export async function getBrand(orgId: string): Promise<BrandProfile> {
  const doc = await getStore().collection<BrandDoc>("brand_profiles").get(orgId);
  if (!doc) return DEFAULT_BRAND;
  const { id: _i, organizationId: _o, updatedAt: _u, updatedBy: _b, ...brand } = doc;
  void _i; void _o; void _u; void _b;
  return { ...DEFAULT_BRAND, ...brand };
}

export async function saveBrand(auth: AuthContext, input: unknown): Promise<BrandProfile> {
  const brand = BrandProfileSchema.parse(input);
  if (brand.logoDataUrl && !isValidPng(Buffer.from(brand.logoDataUrl.slice(brand.logoDataUrl.indexOf(",") + 1), "base64"))) {
    throw badRequest("The logo file could not be read. Upload a PNG, JPG, SVG or WebP image.");
  }
  await getStore().collection<BrandDoc>("brand_profiles").set({
    ...brand,
    id: auth.orgId,
    organizationId: auth.orgId,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.uid,
  });
  await audit(auth.orgId, auth.uid, "brand.update", auth.orgId);
  return brand;
}

/**
 * Delete the signed-in user's account (spec §61). If the user is the last
 * member and owner, all organization data is deleted with it.
 */
export async function deleteAccount(auth: AuthContext, confirm: string) {
  if (!auth.profile) throw badRequest("No account to delete");
  if (confirm !== "DELETE") throw badRequest('Type "DELETE" to confirm');
  const store = getStore();
  const members = await store.collection<UserProfile>("users").query({ where: [["organizationId", "==", auth.orgId]] });
  const otherOwners = members.filter((m) => m.id !== auth.uid && m.role === "owner");
  if (auth.profile.role === "owner" && members.length > 1 && otherOwners.length === 0) {
    throw forbidden("Transfer ownership before deleting your account.");
  }
  if (members.length === 1) {
    for (const name of COLLECTIONS) {
      if (name === "organizations" || name === "users") continue;
      const col = store.collection<{ id: string }>(name);
      const rows = await col.query({ where: [["organizationId", "==", auth.orgId]] });
      for (const r of rows) await col.delete(r.id);
    }
    await store.collection<{ id: string }>("brand_profiles").delete(auth.orgId);
    await store.collection<{ id: string }>("organizations").delete(auth.orgId);
  }
  await store.collection<UserProfile>("users").delete(auth.uid);
}
