// Reference copy of the Cloudflare Worker "london-ai-planner-proxy".
// It is NOT deployed from this repository: edit and deploy it in the Cloudflare dashboard
// (Workers & Pages -> london-ai-planner-proxy -> Edit code), then keep this file in sync.
//
// Route: londontourpackage.com/planner*
// Secret (Worker settings -> Variables and Secrets): PLANNER_PROXY_SECRET
//   Must hold the same value as the PLANNER_PROXY_SECRET environment variable in Vercel (Production).
//   Never put the real value in this file.

const VERCEL_ORIGIN = "https://london-ai-route-generator.vercel.app";

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Not a planner URL at all -> pass through to WordPress untouched
    if (!path.toLowerCase().startsWith("/planner")) {
      return fetch(request);
    }

    // Only /planner and /planner/... are valid; anything else goes to /planner
    const isPlanner = path === "/planner" || path.startsWith("/planner/");
    if (!isPlanner) {
      return Response.redirect(url.origin + "/planner", 302);
    }

    const target = new URL(path + url.search, VERCEL_ORIGIN);
    const proxied = new Request(target, request);

    // Never trust these headers from the visitor; always set them ourselves
    proxied.headers.delete("x-planner-proxy-secret");
    proxied.headers.delete("x-planner-client-ip");
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) proxied.headers.set("x-planner-client-ip", clientIp);
    if (env.PLANNER_PROXY_SECRET) {
      proxied.headers.set("x-planner-proxy-secret", env.PLANNER_PROXY_SECRET);
    }

    const upstream = await fetch(proxied, { redirect: "manual" });

    // If Vercel redirects, keep the visitor on londontourpackage.com
    const location = upstream.headers.get("location");
    if (location && location.startsWith(VERCEL_ORIGIN)) {
      const headers = new Headers(upstream.headers);
      headers.set("location", location.replace(VERCEL_ORIGIN, url.origin));
      return new Response(upstream.body, { status: upstream.status, headers });
    }
    return upstream;
  },
};

export default worker;
