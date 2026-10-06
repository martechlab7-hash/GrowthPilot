import "server-only";

/** Centralised server configuration. Secrets never reach the browser. */
export const env = {
  demoMode: process.env.GROWTHPILOT_DEMO_MODE === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  /** base64-encoded 32-byte key(s). Format: "v1:<b64>,v2:<b64>"; the last one encrypts. */
  encryptionKeys: process.env.CREDENTIALS_ENCRYPTION_KEYS ?? "",
  /** Optional platform-level fallback provider so new orgs can try the product. */
  platformProvider: process.env.PLATFORM_AI_PROVIDER as "openai" | "anthropic" | "gemini" | undefined,
  platformApiKey: process.env.PLATFORM_AI_API_KEY,
};
