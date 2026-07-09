import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/lib/site-url";

// Next.js will serve this file at /sitemap.xml. URLs must be absolute,
// so we build them from resolveSiteUrl() — the same source layout.tsx and
// robots.ts use, keeping canonical/og:url/sitemap entries in sync.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const lastModified = new Date();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/status`,
      lastModified,
      // Status numbers refresh every minute via ISR; declaring `hourly` keeps
      // crawlers visiting often enough without overstating the change rate
      // of the document structure itself.
      changeFrequency: "hourly",
      priority: 0.6,
    },
  ];
}
