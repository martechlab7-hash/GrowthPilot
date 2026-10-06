import "server-only";

interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Token-bucket rate limiter. Per-instance; for multi-instance deployments back
 * this with Redis/Upstash or Firestore counters (see docs/ARCHITECTURE.md).
 */
export function rateLimit(key: string, capacity: number, refillPerMinute: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  const elapsedMin = (now - b.updated) / 60_000;
  b.tokens = Math.min(capacity, b.tokens + elapsedMin * refillPerMinute);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (now - v.updated > 3_600_000) buckets.delete(k);
  }
  return true;
}
