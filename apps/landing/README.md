# FastAuth Landing

Marketing site for [FastAuth](https://peersyst.github.io/fast-auth/) — the Auth0-backed account-abstraction layer for NEAR. Single-page Next.js App Router site that pulls live network metrics from the FastAuth metrics service.

## Stack

- Next.js 16 (App Router) · React 18 · TypeScript
- pnpm as the package manager
- No CSS framework — plain CSS in `app/globals.css`

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server runs on http://localhost:3000.

### Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run `next lint` |

## Project layout

```
app/
  layout.tsx        # Root layout, metadata, gtag.js
  page.tsx          # Single-page composition + ISR (revalidate=60)
  globals.css       # All styles
components/         # Section components (Hero, FAQ, Stats, ...)
lib/
  metrics.ts        # Server-side fetch of live FastAuth metrics
public/brand/       # Logo marks
```

The page is composed top-to-bottom in `app/page.tsx` from the section components in `components/`. Most copy edits land in those files.

## Live metrics

`lib/metrics.ts` fetches public network metrics server-side and feeds them into the Stats section. The endpoint defaults to `https://fastauth-metrics.peersyst.org/api/public/metrics` and is re-validated every 60s. If the request fails, the Stats section renders placeholders instead of crashing the page.

Override the endpoint with:

```bash
FASTAUTH_METRICS_URL=https://your-metrics-host/api/public/metrics
```

## Analytics

Google Analytics (`G-9HVGE9PZ10`) is wired up in `app/layout.tsx` via `next/script` with `strategy="afterInteractive"`. To disable, remove the two `<Script>` tags from the root layout.

## External links

The page links out to two URLs declared at the top of `app/page.tsx`:

- `DOCS_HREF` → https://peersyst.github.io/fast-auth/
- `STATUS_HREF` → https://fast-auth-metrics-dashboard.vercel.app/

Update them there if either moves.

## Deployment

Standard Next.js deployment (Vercel or any Node host). The page uses ISR (`export const revalidate = 60`) so the host must support incremental static regeneration if you want metrics to refresh without a full rebuild.
