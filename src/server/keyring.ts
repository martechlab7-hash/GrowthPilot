import { scryptSync } from "node:crypto";

export interface ParsedKey {
  version: string;
  key: Buffer;
  derived: boolean;
}

const MIN_SECRET_LENGTH = 32;

/**
 * Parse CREDENTIALS_ENCRYPTION_KEYS ("v1:<secret>,v2:<secret>"; the last one
 * encrypts). Each secret may be base64 of 32 random bytes (preferred) or any
 * random string of at least 32 characters, which is stretched with scrypt.
 * Surrounding quotes/whitespace from copy-paste are ignored.
 */
export function parseKeyring(raw: string): ParsedKey[] {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  const keys: ParsedKey[] = [];
  for (const part of cleaned.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)) {
    const idx = part.indexOf(":");
    const hasVersion = idx > 0 && /^v\d+$/.test(part.slice(0, idx));
    const version = hasVersion ? part.slice(0, idx) : "v1";
    const secret = hasVersion ? part.slice(idx + 1).trim() : part;
    if (/^(AQ\.|AIza|sk-|sk-ant-|gsk_|xai-)/.test(secret)) {
      throw new Error(
        `Encryption key ${version} looks like an AI provider API key. CREDENTIALS_ENCRYPTION_KEYS must be a separate random secret you generate yourself; API keys belong in Settings → AI Providers.`,
      );
    }
    const decoded = Buffer.from(secret, "base64");
    const isExactBase64 = decoded.length === 32 && decoded.toString("base64").replace(/=+$/, "") === secret.replace(/=+$/, "");
    if (isExactBase64) {
      keys.push({ version, key: decoded, derived: false });
    } else if (secret.length >= MIN_SECRET_LENGTH) {
      keys.push({ version, key: scryptSync(secret, `growthpilot-credentials-${version}`, 32), derived: true });
    } else {
      throw new Error(
        `Encryption key ${version} is too short (${secret.length} characters). Use at least ${MIN_SECRET_LENGTH} random characters, e.g. the output of "openssl rand -base64 32".`,
      );
    }
  }
  return keys;
}
