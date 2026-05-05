// Read-only projection of the metrics dashboard's getDashboardData() —
// fetched from /api/public/status on the dashboard origin. Same source of
// truth that powers fast-auth-metrics-dashboard's home page.

export type WindowMetrics = {
  last24h: number;
  last7d: number;
  last30d: number;
  all: number;
};

export type SuccessRateWindow = {
  last24h: number | null;
  last7d: number | null;
  last30d: number | null;
  all: number | null;
};

export type StatusUptimeBucket = {
  hour: number;
  fastAuth: number;
  mpc: number;
};

export type StatusFastAuthHealth = {
  successRatePct: number | null;
  successful: number;
  failed: number;
  guardFailed: number;
  rpcPending: number;
  total: number;
  windowBlocks: number;
  windowStartHeight: string;
  windowEndHeight: string;
  lastSuccessAt: string | null;
  minutesSinceLastSuccess: number | null;
  computedAt: string;
};

export type StatusMpcHealth = {
  successRatePct: number | null;
  attempted: number;
  successful: number;
  failed: number;
  rpcPending: number;
  computedAt: string;
};

export type StatusBreakdownRow = {
  label: string;
  txns: number;
  succeeded?: number;
  failed?: number;
  successPct?: number | null;
  all?: number;
};

export type StatusActivityRow = {
  metric: string;
  last24h: number;
  last7d: number;
  last30d: number;
  all: number;
};

export type StatusContract = {
  id: string;
  kind: string;
  balanceYocto: string | null;
  storageBytes: string | null;
  codeHash: string | null;
  owner: string | null;
  version: string | null;
  locked: boolean | null;
  fullAccessKeys: number | null;
  source: string | null;
  snapshotAt: string;
};

export type StatusMissingRange = {
  startHeight: number;
  endHeight: number;
  size: number;
  processed: number;
  pending: number;
  pctProcessed: number;
  ascCursor: number | null;
  descCursor: number | null;
  status: "open" | "closed";
  reason: string;
  recordedAt: string;
};

export type StatusFailure = {
  at: string;
  kind: "guard_failure" | "mpc_failure" | "other";
  executor: string;
  reason: string;
  txHash: string;
};

export type StatusData = {
  generatedAt: string;
  revalidateSeconds: number;

  summary: {
    overall: "operational" | "degraded";
    fastAuthSuccess24h: number | null;
    mpcSuccess24h: number | null;
    txLast24h: number;
    accountsTotal: number;
    activeUsers24h: number;
    chainHead: string | null;
  };

  fastAuthHealth: StatusFastAuthHealth | null;
  mpcHealth: StatusMpcHealth | null;
  uptime24h: StatusUptimeBucket[];

  accounts: {
    total: number;
    indexed: number;
    migrated: number;
    firstSeen: WindowMetrics;
    active: WindowMetrics;
  };

  transactions: {
    signed: WindowMetrics;
    failed: WindowMetrics;
    pending?: WindowMetrics;
    total: WindowMetrics;
  };

  realActivity: {
    trackingStartedAt: { blockHeight: string; blockTimestamp: string } | null;
    rows: StatusActivityRow[];
    successRate: SuccessRateWindow;
    breakdowns: {
      receivers: StatusBreakdownRow[];
      methods: StatusBreakdownRow[];
      relayers: StatusBreakdownRow[];
      providers: StatusBreakdownRow[];
      guards: StatusBreakdownRow[];
    };
  };

  actionTypes: { name: string; txns24h: number; pct: number }[];

  topAccounts: { accountId: string; calls24h: number; callsAll: number }[];
  topAccountsTotal: number;

  recentFailures: StatusFailure[];
  recentFailuresWindow: string;

  contracts: StatusContract[];
  contractsTrackedSince: string | null;

  indexer: {
    chainHead: string | null;
    scannedHeight: string | null;
    backfillStartHeight: string | null;
    blocksBehind: number | null;
    minutesBehind: number | null;
    latestIndexedAt: string | null;
  };

  missingRanges: StatusMissingRange[];
};

function resolveStatusUrl(): string | null {
  const fromEnv = process.env.FASTAUTH_STATUS_URL?.trim();
  if (fromEnv) return fromEnv;

  // Fall back to the metrics URL host with the /api/public/status path —
  // both routes live on the same dashboard origin.
  const metricsUrl = process.env.FASTAUTH_METRICS_URL?.trim();
  if (metricsUrl) {
    try {
      const u = new URL(metricsUrl);
      return `${u.origin}/api/public/status`;
    } catch {
      // fall through to dev default
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000/api/public/status";
  }
  return null;
}

let lastWarnAt = 0;
const WARN_INTERVAL_MS = 60_000;

function warnOnce(message: string, error?: unknown) {
  const now = Date.now();
  if (now - lastWarnAt < WARN_INTERVAL_MS) return;
  lastWarnAt = now;
  if (error) console.warn(`[fastauth-status] ${message}`, error);
  else console.warn(`[fastauth-status] ${message}`);
}

export async function fetchStatusData(): Promise<StatusData | null> {
  const url = resolveStatusUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      warnOnce(`status endpoint ${url} returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as Partial<StatusData>;
    if (!data?.summary || !data?.accounts) return null;
    return data as StatusData;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (cause?.code === "ENOTFOUND" || cause?.code === "ECONNREFUSED") {
      warnOnce(`status endpoint ${url} unreachable (${cause.code})`);
    } else {
      warnOnce("failed to fetch status", error);
    }
    return null;
  }
}
