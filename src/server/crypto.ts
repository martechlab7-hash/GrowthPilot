import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

export interface EncryptedSecret {
  v: string; // key version
  iv: string;
  tag: string;
  data: string;
}

let demoKey: Buffer | undefined;

function keyring(): Map<string, Buffer> {
  const ring = new Map<string, Buffer>();
  for (const part of env.encryptionKeys.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [version, b64] = part.includes(":") ? part.split(":", 2) : ["v1", part];
    const key = Buffer.from(b64!, "base64");
    if (key.length !== 32) throw new Error(`Encryption key ${version} must be 32 bytes (base64)`);
    ring.set(version!, key);
  }
  if (ring.size === 0) {
    if (!env.demoMode) {
      throw new Error("CREDENTIALS_ENCRYPTION_KEYS is not configured; refusing to store credentials.");
    }
    // Demo mode only: ephemeral per-process key. Never used in production.
    demoKey ??= randomBytes(32);
    ring.set("demo", demoKey);
  }
  return ring;
}

/** AES-256-GCM encryption at rest for API credentials (spec §30). */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const ring = keyring();
  const [version, key] = [...ring.entries()].at(-1)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { v: version, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const key = keyring().get(secret.v);
  if (!key) throw new Error(`Unknown encryption key version ${secret.v}`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(secret.data, "base64")), decipher.final()]).toString("utf8");
}

/** sk-••••••••••••••••abcd */
export function maskKey(key: string): string {
  const prefix = key.startsWith("sk-") ? "sk-" : key.slice(0, 2);
  const tail = key.length > 12 ? key.slice(-4) : "";
  return `${prefix}${"•".repeat(16)}${tail}`;
}
