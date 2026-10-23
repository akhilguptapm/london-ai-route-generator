import { timingSafeEqual } from "node:crypto";

// The app is meant to be reached only through the Cloudflare Worker (londontourpackage.com/planner).
// The Worker adds two headers to every request it forwards:
//   x-planner-proxy-secret  a shared secret, so the app can tell the request really came from the Worker
//   x-planner-client-ip     the visitor's real IP (cf-connecting-ip), used for rate limiting
//
// Why: without this, anyone could call the *.vercel.app address directly and skip Cloudflare's protections,
// and behind the proxy Vercel only sees Cloudflare's IPs, so per-IP rate limiting would not work.
//
// Enforcement switches on when PLANNER_PROXY_SECRET is set (Vercel production env). With it unset (local dev,
// or before the secret is rolled out) nothing is enforced, so the site keeps working.

export const PROXY_SECRET_HEADER = "x-planner-proxy-secret";
export const PROXY_CLIENT_IP_HEADER = "x-planner-client-ip";

function configuredSecret(): string {
  return process.env.PLANNER_PROXY_SECRET?.trim() ?? "";
}

export function isProxyEnforced(): boolean {
  return configuredSecret() !== "";
}

/** True when the request carries the correct shared secret (constant-time comparison). */
export function hasValidProxySecret(req: Request): boolean {
  const expected = configuredSecret();
  const provided = req.headers.get(PROXY_SECRET_HEADER)?.trim() ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns a 403 response when enforcement is on and the request did not come through the Worker, else null. */
export function rejectIfNotFromProxy(req: Request): Response | null {
  if (!isProxyEnforced() || hasValidProxySecret(req)) return null;
  return Response.json({ error: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
