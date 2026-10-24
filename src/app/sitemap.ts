import type { MetadataRoute } from "next";

// Served at londontourpackage.com/planner/sitemap.xml (basePath is /planner).
// The WordPress sitemap (Yoast) does not list the planner, so submit this one in Google Search Console.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://londontourpackage.com/planner",
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
