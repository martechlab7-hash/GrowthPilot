import "server-only";
import type { NextRequest } from "next/server";
import type { Organization, UserProfile } from "@/domain/types";
import { env } from "./env";
import { adminAuth } from "./firebaseAdmin";
import { HttpError } from "./errors";
import { log } from "./logger";
import { getStore } from "./store";

export interface AuthContext {
  uid: string;
  email: string;
  name: string;
  profile: UserProfile | null;
  /** Present once onboarded; every data access is scoped to it. */
  orgId: string;
  /** Provider/model the user picked for AI runs (validated against the org's providers). */
  aiPreference?: { providerId: string; model?: string };
}

export const DEMO_UID = "demo-user";

export async function verifyRequest(req: NextRequest): Promise<{ uid: string; email: string; name: string }> {
  if (env.demoMode) {
    return { uid: DEMO_UID, email: "demo@growthpilot.local", name: "Demo Strategist" };
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email ?? "", name: (decoded.name as string | undefined) ?? decoded.email ?? "User" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code ?? "";
    log("warn", "auth.verify_failed", { code, message });
    if (code === "auth/id-token-expired" || code === "auth/id-token-revoked" || code === "auth/user-disabled") {
      throw new HttpError(401, "Session expired. Please sign in again.", "UNAUTHENTICATED");
    }
    if (code === "auth/argument-error" && /"aud" \(audience\) claim/.test(message)) {
      throw new HttpError(500, "Server Firebase project does not match the web app. FIREBASE_PROJECT_ID must equal NEXT_PUBLIC_FIREBASE_PROJECT_ID.", "SERVER_MISCONFIGURED");
    }
    if (/credential|private key|PEM|DECODER|invalid_grant|service account/i.test(message)) {
      throw new HttpError(500, "Server Firebase credentials are invalid. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see /api/health?deep=1).", "SERVER_MISCONFIGURED");
    }
    throw new HttpError(401, `Could not verify your session (${code || "unknown error"}). Please sign in again.`, "UNAUTHENTICATED");
  }
}

export async function requireUser(
  req: NextRequest,
  opts: { allowUnonboarded?: boolean } = {},
): Promise<AuthContext> {
  const identity = await verifyRequest(req);
  const profile = await getStore().collection<UserProfile>("users").get(identity.uid);
  if (!profile && !opts.allowUnonboarded) {
    throw new HttpError(403, "Account setup required", "NOT_ONBOARDED");
  }
  const providerId = req.headers.get("x-ai-provider")?.trim();
  const model = req.headers.get("x-ai-model")?.trim();
  const aiPreference = providerId && /^[\w-]{1,64}$/.test(providerId) ? { providerId, ...(model && model.length <= 120 ? { model } : {}) } : undefined;
  return { ...identity, profile, orgId: profile?.organizationId ?? "", ...(aiPreference ? { aiPreference } : {}) };
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  return getStore().collection<Organization & { id: string }>("organizations").get(orgId);
}
