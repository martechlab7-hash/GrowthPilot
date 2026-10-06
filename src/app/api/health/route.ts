import { createPrivateKey } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env, serverConfigProblems } from "@/server/env";
import { adminDb } from "@/server/firebaseAdmin";

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail: string };

/**
 * Configuration health. `?deep=1` actually exercises the credentials
 * (never echoing secrets) so deployment mistakes are diagnosable.
 */
export async function GET(req: NextRequest) {
  const missing = serverConfigProblems();
  const checks: Check[] = [];

  if (req.nextUrl.searchParams.get("deep") === "1" && !env.demoMode) {
    const webProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    checks.push({
      name: "project_id_match",
      ok: !!env.firebaseProjectId && env.firebaseProjectId === webProject,
      detail: env.firebaseProjectId === webProject ? "FIREBASE_PROJECT_ID matches the web app" : `FIREBASE_PROJECT_ID (${env.firebaseProjectId ?? "unset"}) must equal NEXT_PUBLIC_FIREBASE_PROJECT_ID (${webProject ?? "unset"})`,
    });

    if (env.firebasePrivateKey) {
      try {
        createPrivateKey(env.firebasePrivateKey);
        checks.push({ name: "private_key_format", ok: true, detail: "FIREBASE_PRIVATE_KEY parses as a valid key" });
      } catch {
        checks.push({ name: "private_key_format", ok: false, detail: "FIREBASE_PRIVATE_KEY is not a valid PEM key. Paste the full private_key value from the service-account JSON, including the BEGIN/END lines." });
      }
    }

    checks.push({
      name: "client_email",
      ok: !!env.firebaseClientEmail?.endsWith(".iam.gserviceaccount.com"),
      detail: env.firebaseClientEmail?.endsWith(".iam.gserviceaccount.com") ? "Service account email looks valid" : "FIREBASE_CLIENT_EMAIL should be the client_email from the service-account JSON (…@….iam.gserviceaccount.com)",
    });

    const keys = env.encryptionKeys.split(",").map((s) => s.trim()).filter(Boolean);
    const keysOk = keys.length > 0 && keys.every((k) => Buffer.from(k.includes(":") ? k.split(":", 2)[1]! : k, "base64").length === 32);
    checks.push({ name: "encryption_keys", ok: keysOk, detail: keysOk ? "CREDENTIALS_ENCRYPTION_KEYS valid" : 'CREDENTIALS_ENCRYPTION_KEYS must be "v1:<base64 of 32 random bytes>"' });

    if (!missing.length) {
      try {
        await adminDb().collection("organizations").limit(1).get();
        checks.push({ name: "firestore", ok: true, detail: "Connected to Firestore with the service account" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        checks.push({
          name: "firestore",
          ok: false,
          detail: /NOT_FOUND|does not exist/i.test(msg)
            ? "Firestore database not found. Create it in Firebase → Build → Firestore Database."
            : /PERMISSION_DENIED/i.test(msg)
              ? "Service account lacks Firestore access. Use a key generated from Project settings → Service accounts."
              : `Firestore connection failed: ${msg.slice(0, 200)}`,
        });
      }
    }
  }

  const healthy = missing.length === 0 && checks.every((c) => c.ok);
  return NextResponse.json(
    { status: healthy ? "ok" : "misconfigured", demoMode: env.demoMode, missingEnv: missing, checks, time: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
