import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseKeyring } from "./keyring";

describe("parseKeyring", () => {
  const b64 = randomBytes(32).toString("base64");

  it("uses base64 32-byte keys directly, with or without version and quotes", () => {
    for (const raw of [`v1:${b64}`, b64, `"v1:${b64}"`, ` v1:${b64} `]) {
      const [k] = parseKeyring(raw);
      expect(k!.version).toBe("v1");
      expect(k!.derived).toBe(false);
      expect(k!.key.toString("base64")).toBe(b64);
    }
  });

  it("stretches any long random string deterministically", () => {
    const secret = "correct-horse-battery-staple-0123456789-xyz";
    const [a] = parseKeyring(`v1:${secret}`);
    const [b] = parseKeyring(secret);
    expect(a!.derived).toBe(true);
    expect(a!.key).toHaveLength(32);
    expect(a!.key.equals(b!.key)).toBe(true);
  });

  it("supports rotation lists and rejects short secrets clearly", () => {
    expect(parseKeyring(`v1:${b64},v2:${randomBytes(32).toString("base64")}`).map((k) => k.version)).toEqual(["v1", "v2"]);
    expect(() => parseKeyring("v1:short")).toThrow(/too short/);
    expect(() => parseKeyring("AQ.Ab8RN6JXKfawCib_teIylLpGNtzBT1FsMxVKdgpb")).toThrow(/API key/);
    expect(() => parseKeyring("v1:sk-proj-abcdefghijklmnopqrstuvwxyz0123456789")).toThrow(/API key/);
  });
});
