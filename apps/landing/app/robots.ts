import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/lib/site-url";

// Next.js serves this file at /robots.txt. Allow everything (the landing has
// no private routes) and point crawlers at the sitemap so they discover both
// "/" and "/status" without relying on internal navigation links alone.
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
