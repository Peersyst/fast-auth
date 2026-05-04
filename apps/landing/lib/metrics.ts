// Live FastAuth network metrics, fetched server-side from the metrics
// dashboard's public endpoint. Re-validated every 60s (matches the API's own
// cache horizon). Returns null on failure so the Stats section can render
// placeholders rather than crashing the page.

export type LiveMetrics = {
  fetchedAt: string;
  accounts: {
    // Combined total: indexed (accounts table) + migrated (legacy FastAuth
    // pre-indexer cohort). Use this for headline numbers.
    total: number;
    // Sub-totals so the UI can show the breakdown.
    indexed: number;
    migrated: number;
    // Windowed metrics — indexed cohort only (migrated has no timestamps).
    new24h: number;
    active24h: number;
    active7d: number;
    active30d?: number;
  };
  signEvents: { last7d: number; last30d?: number };
  relayers: { total: number };
  health24h: {
    uptimePct: number | null;
    classified: number;
    successful: number;
    failed: number;
  };
};

function resolveUrl(): string | null {
  const fromEnv = process.env.FASTAUTH_METRICS_URL?.trim();
  if (fromEnv) return fromEnv;
  // Dev convenience: dashboard typically runs on :3000 alongside this landing
  // on :3001. In production we require an explicit URL — return null so
  // fetchLiveMetrics short-circuits without trying to resolve a placeholder.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000/api/public/metrics";
  }
  return null;
}

// Throttle warnings so a long-running dev session with the dashboard offline
// doesn't spam the console on every request / re-render.
let lastWarnAt = 0;
const WARN_INTERVAL_MS = 60_000;

function warnOnce(message: string, error?: unknown) {
  const now = Date.now();
  if (now - lastWarnAt < WARN_INTERVAL_MS) return;
  lastWarnAt = now;
  if (error) console.warn(`[fastauth-landing] ${message}`, error);
  else console.warn(`[fastauth-landing] ${message}`);
}

export async function fetchLiveMetrics(): Promise<LiveMetrics | null> {
  const url = resolveUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      warnOnce(`metrics endpoint ${url} returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as Partial<LiveMetrics>;
    if (
      typeof data?.accounts?.total !== "number" ||
      typeof data?.accounts?.indexed !== "number" ||
      typeof data?.accounts?.migrated !== "number"
    ) {
      return null;
    }
    return data as LiveMetrics;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (cause?.code === "ENOTFOUND" || cause?.code === "ECONNREFUSED") {
      warnOnce(`metrics endpoint ${url} unreachable (${cause.code})`);
    } else {
      warnOnce("failed to fetch live metrics", error);
    }
    return null;
  }
}
