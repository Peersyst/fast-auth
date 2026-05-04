// Shared formatters for the /status page.

const NUMBER = new Intl.NumberFormat("en-US");
const NUMBER_6 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

const YOCTO_PER_NEAR = 1_000_000_000_000_000_000_000_000n;

export function fmtN(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return NUMBER.format(n);
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}

export function fmtNearFromYocto(yocto: string | null): string {
  if (!yocto) return "—";
  try {
    const big = BigInt(yocto);
    // Convert with 6-decimal precision via integer math.
    const whole = big / YOCTO_PER_NEAR;
    const frac = big % YOCTO_PER_NEAR;
    const fracDecimal = Number(frac) / Number(YOCTO_PER_NEAR);
    return NUMBER_6.format(Number(whole) + fracDecimal);
  } catch {
    return "—";
  }
}

export function fmtKbFromBytes(bytes: string | null): string {
  if (!bytes) return "—";
  try {
    const big = BigInt(bytes);
    const kb = Number(big) / 1024;
    return `${kb.toLocaleString("en-US", { maximumFractionDigits: 2 })} KB`;
  } catch {
    return "—";
  }
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtAbsolute(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}

export function shortHash(hash: string | null, head = 8, tail = 6): string {
  if (!hash) return "—";
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function shortAccount(id: string, head = 14, tail = 13): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
