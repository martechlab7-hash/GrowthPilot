import "server-only";
import type { NextRequest } from "next/server";
import type { Organization, UserProfile } from "@/domain/types";
import { env } from "./env";
import { adminAuth } from "./firebaseAdmin";
import { HttpError } from "./errors";
import { getStore } from "./store";

export interface AuthContext {
  uid: string;
  email: string;
  name: string;
  profile: UserProfile | null;
  /** Present once onboarded; every data access is scoped to it. */
  orgId: string;
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
  } catch {
    throw new HttpError(401, "Session expired. Please sign in again.", "UNAUTHENTICATED");
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
  return { ...identity, profile, orgId: profile?.organizationId ?? "" };
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  return getStore().collection<Organization & { id: string }>("organizations").get(orgId);
}
