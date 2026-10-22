// Marketplace installs inject either the UPSTASH_* or the legacy KV_* variable names.
// Returns null when Redis isn't configured (e.g. local dev), so callers can degrade gracefully.
export function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
