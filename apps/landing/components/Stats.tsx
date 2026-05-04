"use client";

import { useEffect, useState } from "react";

import type { LiveMetrics } from "@/lib/metrics";
import { ArrowRight } from "./icons";

type Props = { metrics: LiveMetrics | null; statusHref: string };

const NUMBER_FMT = new Intl.NumberFormat("en-US");

export default function Stats({ metrics, statusHref }: Props) {
  const updatedLabel = useFreshnessLabel(metrics?.fetchedAt ?? null);

  return (
    <section className="stats" id="stats">
      <div className="container">
        <div className="statsHead">
          <div>
            <p className="sectionKicker"><span className="kn">04</span>  Live network</p>
            <h2 className="sectionTitle">Numbers, not promises.</h2>
          </div>
          <span className="liveBadge">
            <span className="ld" />
            {metrics ? (
              <>
                Updated <span className="lt">{updatedLabel}</span>
              </>
            ) : (
              <span className="lt">Live data unavailable</span>
            )}
          </span>
        </div>

        <div className="statsGrid">
          <article className="statCard">
            <h3>Total accounts</h3>
            <p className="v">{formatNumber(metrics?.accounts.total)}</p>
            <span className="delta">{formatTodayDelta(metrics?.accounts.new24h)}</span>
          </article>

          <article className="statCard">
            <h3>Active (24h)</h3>
            <p className="v">{formatNumber(metrics?.accounts.active30d)}</p>
            <span className="delta">{formatWeeklyContext(metrics?.accounts.active7d)}</span>
          </article>

          <article className="statCard">
            <h3>Sign events (7d)</h3>
            <p className="v">{formatNumber(metrics?.signEvents.last30d)}</p>
            <span className="delta">{formatRelayers(metrics?.relayers.total)}</span>
          </article>

          <article className="statCard statCard--mint">
            <h3>FastAuth uptime</h3>
            <p className="v">{formatUptime(metrics?.health24h.uptimePct ?? null)}</p>
            <span className="delta">{formatUptimeWindow(metrics?.health24h.classified)}</span>
          </article>
        </div>

        <a href={statusHref} className="statsLink">
          View full status dashboard <ArrowRight />
        </a>
      </div>
    </section>
  );
}

function formatNumber(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return NUMBER_FMT.format(value);
}

function formatUptime(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct.toFixed(1)}%`;
}

function formatTodayDelta(n: number | undefined | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "today";
  return `↑ ${NUMBER_FMT.format(n)} today`;
}

function formatWeeklyContext(n: number | undefined | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "7d window";
  return `${NUMBER_FMT.format(n)} active in 7d`;
}

function formatRelayers(n: number | undefined | null): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "live network";
  return `across ${NUMBER_FMT.format(n)} relayer${n === 1 ? "" : "s"}`;
}

function formatUptimeWindow(classified: number | undefined | null): string {
  if (typeof classified !== "number" || !Number.isFinite(classified) || classified <= 0) {
    return "last 24h";
  }
  return `${NUMBER_FMT.format(classified)} sigs · 24h`;
}

function useFreshnessLabel(iso: string | null): string {
  const [label, setLabel] = useState<string>(() => fmtAge(iso));

  useEffect(() => {
    if (!iso) return;
    setLabel(fmtAge(iso));
    const i = setInterval(() => setLabel(fmtAge(iso)), 15_000);
    return () => clearInterval(i);
  }, [iso]);

  return label;
}

function fmtAge(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
