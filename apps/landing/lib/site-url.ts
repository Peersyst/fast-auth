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
const FALLBACK_SITE_URL = "https://auth.near.org";

// Coerce any candidate into a canonical absolute-HTTPS origin: prepend the
// scheme when it's missing (so `auth.near.org` doesn't throw in `new URL()`),
// and collapse to `origin` so a stray path or trailing slash can't produce
// malformed joins like `https://host//sitemap.xml`. Falls back if unparseable.
function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return FALLBACK_SITE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalizeSiteUrl(explicit);
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return normalizeSiteUrl(vercelProd);
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return normalizeSiteUrl(vercelUrl);
  return FALLBACK_SITE_URL;
}
