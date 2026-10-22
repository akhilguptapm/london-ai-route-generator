import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redisCredentials } from "@/lib/redis-env";

// Protects /api/generate from burning OpenAI tokens. Only *uncached* generations count: cache hits cost
// nothing, so they are never limited (the route checks the cache first).
//
// A sliding window per client IP, stored in Upstash Redis so the limit holds across serverless instances.
// With no Redis configured (local dev) limiting is skipped. Any Redis failure also lets the request through -
// a limiter outage must not take the product down.

/** Max uncached generations per client within the window. A 7-day trip is 8 model calls, so keep this low. */
export const RATE_LIMIT_REQUESTS = 6;
export const RATE_LIMIT_WINDOW = "10 m" as const;

let limiter: Ratelimit | null | undefined; // undefined = not initialised yet
function getLimiter(): Ratelimit | null {
  if (limiter === undefined) {
    const creds = redisCredentials();
    limiter = creds
      ? new Ratelimit({
          redis: new Redis(creds),
          limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
          prefix: "ratelimit:generate",
          timeout: 1500, // if Redis is slow, let the request through rather than stall the user
        })
      : null;
  }
  return limiter;
}

/** Best-effort client identifier. On Vercel, x-forwarded-for is set by the platform. */
export function getClientId(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "anonymous";
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkGenerateRateLimit(clientId: string): Promise<RateLimitResult> {
  const rl = getLimiter();
  if (!rl) return { allowed: true };
  try {
    const { success, reset } = await rl.limit(clientId);
    if (success) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (error) {
    console.error("[rate-limit] check failed, allowing request:", error);
    return { allowed: true };
  }
}
