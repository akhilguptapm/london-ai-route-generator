import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redisCredentials } from "@/lib/redis-env";
import { hasValidProxySecret, PROXY_CLIENT_IP_HEADER } from "@/lib/proxy-guard";

// Protects /api/generate from burning OpenAI tokens. Only *uncached* generations count: cache hits cost
// nothing, so they are never limited (the route checks the cache first).
//
// A sliding window per client IP, stored in Upstash Redis so the limit holds across serverless instances.
// With no Redis configured (local dev) limiting is skipped. Any Redis failure also lets the request through -
// a limiter outage must not take the product down.

/** Max uncached generations per client within the window. A 7-day trip is 8 model calls, so keep this low. */
export const RATE_LIMIT_REQUESTS = 6;
export const RATE_LIMIT_WINDOW = "10 m" as const;

/** Saves are cheap compared with generation, but a public endpoint still needs a cap. */
export const SHARE_RATE_LIMIT_REQUESTS = 20;
export const SHARE_RATE_LIMIT_WINDOW = "10 m" as const;

function buildLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string): Ratelimit | null {
  const creds = redisCredentials();
  if (!creds) return null;
  return new Ratelimit({
    redis: new Redis(creds),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
    timeout: 1500, // if Redis is slow, let the request through rather than stall the user
  });
}

let limiter: Ratelimit | null | undefined; // undefined = not initialised yet
function getLimiter(): Ratelimit | null {
  if (limiter === undefined) {
    limiter = buildLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW, "ratelimit:generate");
  }
  return limiter;
}

let shareLimiter: Ratelimit | null | undefined;
function getShareLimiter(): Ratelimit | null {
  if (shareLimiter === undefined) {
    shareLimiter = buildLimiter(SHARE_RATE_LIMIT_REQUESTS, SHARE_RATE_LIMIT_WINDOW, "ratelimit:share");
  }
  return shareLimiter;
}

/**
 * Best-effort client identifier.
 * Behind the Cloudflare Worker, Vercel only sees Cloudflare's IPs, so the Worker passes the real visitor IP in
 * a header. That header is trusted only when the request also carries the shared proxy secret (otherwise anyone
 * could spoof it to dodge the limit). Otherwise fall back to x-forwarded-for, which Vercel sets itself.
 */
export function getClientId(req: Request): string {
  if (hasValidProxySecret(req)) {
    const proxied = req.headers.get(PROXY_CLIENT_IP_HEADER)?.trim();
    if (proxied) return proxied;
  }
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "anonymous";
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

async function runLimit(rl: Ratelimit | null, clientId: string, label: string): Promise<RateLimitResult> {
  if (!rl) return { allowed: true };
  try {
    const { success, reset } = await rl.limit(clientId);
    if (success) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (error) {
    console.error(`[rate-limit] ${label} check failed, allowing request:`, error);
    return { allowed: true };
  }
}

export function checkGenerateRateLimit(clientId: string): Promise<RateLimitResult> {
  return runLimit(getLimiter(), clientId, "generate");
}

export function checkShareRateLimit(clientId: string): Promise<RateLimitResult> {
  return runLimit(getShareLimiter(), clientId, "share");
}
