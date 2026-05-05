// Shared formatters for the /status page.
//
// Manual (non-Intl) formatting is intentional. `Intl.NumberFormat` and
// `Date.toLocaleString` produce *visually* identical output on Node.js and
// in the browser, but the actual code points can differ — Chrome / Safari
// inject narrow no-break spaces (U+202F) before "AM/PM", LTR marks (U+200E),
// and similar invisible characters that Node.js's V8 build doesn't emit.
// Any client component (Activity, Failures, Pagination, …) that renders
// these strings hits a hydration mismatch on the first paint, which forces
// React to throw away the SSR'd tree and re-render — the visible symptom
// being that buttons don't fire onClick on the first reload, only the
// second. Doing the formatting manually here keeps server and client byte-
// for-byte identical.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YOCTO_PER_NEAR = 1_000_000_000_000_000_000_000_000n;

// Insert thousands separators into an integer string. "12345" → "12,345".
function withCommas(intStr: string): string {
  const negative = intStr.startsWith("-");
  const body = negative ? intStr.slice(1) : intStr;
  const groups: string[] = [];
  for (let i = body.length; i > 0; i -= 3) {
    groups.unshift(body.slice(Math.max(0, i - 3), i));
  }
  return (negative ? "-" : "") + groups.join(",");
}

// Format a finite number with up to `digits` fractional places. Trailing
// zeros are NOT trimmed to keep the look stable across rows.
function fmtNumber(n: number, digits = 0): string {
  if (digits === 0) return withCommas(String(Math.trunc(n)));
  const fixed = n.toFixed(digits); // deterministic — produces "1234.50"
  const dot = fixed.indexOf(".");
  if (dot === -1) return withCommas(fixed);
  return withCommas(fixed.slice(0, dot)) + fixed.slice(dot);
}

export function fmtN(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return fmtNumber(n, 0);
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${fmtNumber(n, digits)}%`;
}

export function fmtNearFromYocto(yocto: string | null): string {
  if (!yocto) return "—";
  try {
    const big = BigInt(yocto);
    const whole = big / YOCTO_PER_NEAR;
    const frac = big % YOCTO_PER_NEAR;
    const fracDecimal = Number(frac) / Number(YOCTO_PER_NEAR);
    return fmtNumber(Number(whole) + fracDecimal, 6);
  } catch {
    return "—";
  }
}

export function fmtKbFromBytes(bytes: string | null): string {
  if (!bytes) return "—";
  try {
    const big = BigInt(bytes);
    const kb = Number(big) / 1024;
    return `${fmtNumber(kb, 2)} KB`;
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
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`;
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
