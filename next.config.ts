import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at londontourpackage.com/planner via a Cloudflare Worker proxy.
  basePath: "/planner",
  cacheComponents: true,
  partialPrefetching: true,
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
