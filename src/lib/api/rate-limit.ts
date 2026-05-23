/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for single-instance deployments. For multi-instance production
 * replace the store with a Redis-backed counter (Upstash, etc.).
 *
 * The store auto-prunes expired entries on every call so it doesn't grow
 * unboundedly under normal traffic.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 60_000; // prune every minute

function maybeprune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment a rate-limit bucket.
 *
 * @param key      Unique bucket key, e.g. `login:${ip}` or `api:${ip}`
 * @param limit    Maximum requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeprune(now);

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt };
}
