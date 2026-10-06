/** Firestore rejects `undefined`; drop such keys (recursively) before writing. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map(stripUndefined) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (v !== undefined) out[k] = stripUndefined(v);
    return out as T;
  }
  return value;
}

/** Path of the first `undefined` value, for strict test stores. */
export function findUndefined(value: unknown, path = ""): string | null {
  if (value === undefined) return path || "(root)";
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const p = findUndefined(value[i], `${path}[${i}]`);
      if (p) return p;
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const p = findUndefined(v, path ? `${path}.${k}` : k);
      if (p) return p;
    }
  }
  return null;
}
