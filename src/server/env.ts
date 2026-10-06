import "server-only";

/** Centralised server configuration. Secrets never reach the browser. */
export const env = {
  demoMode: process.env.GROWTHPILOT_DEMO_MODE === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  /** base64-encoded 32-byte key(s). Format: "v1:<b64>,v2:<b64>"; the last one encrypts. */
  encryptionKeys: process.env.CREDENTIALS_ENCRYPTION_KEYS ?? "",
  /** Optional platform-level fallback provider so new orgs can try the product. */
  platformProvider: process.env.PLATFORM_AI_PROVIDER as "openai" | "anthropic" | "gemini" | undefined,
  platformApiKey: process.env.PLATFORM_AI_API_KEY,
};

/** Server configuration problems, reported instead of failing opaquely. */
export function serverConfigProblems(): string[] {
  if (env.demoMode) return [];
  const missing: string[] = [];
  if (!env.firebaseProjectId) missing.push("FIREBASE_PROJECT_ID");
  // On Vercel there are no Application Default Credentials: a service account is required.
  if (process.env.VERCEL && (!env.firebaseClientEmail || !env.firebasePrivateKey)) {
    missing.push("FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY");
  }
  if (!env.encryptionKeys) missing.push("CREDENTIALS_ENCRYPTION_KEYS");
  return missing;
}

/** Accepts the key pasted with literal "\n", real newlines, or wrapped in quotes. */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  return key.replace(/\\n/g, "\n").replace(/\r/g, "");
}
