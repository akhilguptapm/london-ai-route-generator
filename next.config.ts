import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at londontourpackage.com/planner via a Cloudflare Worker proxy.
  basePath: "/planner",
  cacheComponents: true,
  partialPrefetching: true,
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
