// Resolve the canonical site URL once and reuse it across layout, sitemap,
// and robots so OG/canonical/sitemap entries always agree.
//
// Precedence (first match wins):
//   1. NEXT_PUBLIC_SITE_URL  — explicit override, set in production deploys.
//   2. VERCEL_PROJECT_PRODUCTION_URL — the stable production domain on Vercel.
//   3. VERCEL_URL            — the per-deployment preview host on Vercel.
//   4. https://auth.near.org — productive destination; correct fallback for
//                              local builds and previews that need to render
//                              absolute URLs that would otherwise leak the
//                              preview hostname into og:url / sitemap.
export function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "https://auth.near.org";
}
