import type { MiddlewareHandler } from "hono";
import { TooManyRequests } from "../lib/errors.js";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

interface Options {
  /** Max tokens (burst capacity). */
  capacity: number;
  /** Tokens added per second. */
  refillPerSecond: number;
  /** How to identify the caller — used as the bucket key. */
  keyer?: (c: Parameters<MiddlewareHandler>[0]) => string | null;
}

const buckets = new Map<string, Bucket>();

// Best-effort sweep so a flood of distinct IPs can't leak memory forever.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const STALE_AFTER_MS = 10 * 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now - b.updatedAt > STALE_AFTER_MS) buckets.delete(k);
  }
}

/** In-memory token bucket limiter — single-instance MVP.
 *  For multi-instance deployments swap the `buckets` map for Upstash Redis. */
export const rateLimit = (options: Options): MiddlewareHandler => {
  const { capacity, refillPerSecond, keyer } = options;
  const refillPerMs = refillPerSecond / 1000;

  return async (c, next) => {
    const key = keyer?.(c) ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const now = Date.now();
    sweep(now);
    const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
    const elapsed = now - bucket.updatedAt;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillPerSecond);
      c.header("Retry-After", String(retryAfterSec));
      buckets.set(key, bucket);
      throw TooManyRequests(`Too many requests; retry in ${retryAfterSec}s`);
    }
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    await next();
  };
};
