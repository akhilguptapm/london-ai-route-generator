import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at londontourpackage.com/planner via a Cloudflare Worker proxy.
  basePath: "/planner",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Basic hardening headers. (No Content-Security-Policy yet: Next.js inline scripts need a nonce setup first.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Same-origin framing only (the planner and WordPress share londontourpackage.com).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  // The bare *.vercel.app root has no page now that the app lives under /planner.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/planner",
        basePath: false,
        permanent: false,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
