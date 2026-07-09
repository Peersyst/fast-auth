"use client";

import { useState } from "react";

import type { StatusBreakdownRow, StatusData } from "@/lib/status";
import NearblocksLink from "./NearblocksLink";
import SectionLabel from "./SectionLabel";
import { fmtAbsolute, fmtN, fmtPct } from "./format";

const ACCOUNT_TABS = new Set<BreakdownKey>(["receivers", "relayers", "guards"]);

const TABS: { id: BreakdownKey | "overall"; label: string; col: string }[] = [
  { id: "overall", label: "Overall", col: "Metric" },
  { id: "receivers", label: "By receiver / dApp", col: "Receiver" },
  { id: "methods", label: "By method", col: "Method" },
  { id: "relayers", label: "By relayer", col: "Relayer" },
  { id: "providers", label: "By provider", col: "Provider" },
  { id: "guards", label: "By guard", col: "Guard" },
];

type BreakdownKey = "receivers" | "methods" | "relayers" | "providers" | "guards";

export default function Activity({ data }: { data: StatusData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overall");
  const a = data.realActivity;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <section className="dashSection">
      <div className="container">
        <SectionLabel num="03" title="Activity" hint="On-chain txs from FastAuth-derived accounts" />

        {a.trackingStartedAt ? (
          <p className="trackingSince">
            Tracking from {fmtAbsolute(a.trackingStartedAt.blockTimestamp)} · block{" "}
            {fmtN(Number(a.trackingStartedAt.blockHeight))}. Earlier history is not indexed.
          </p>
        ) : null}

        <div className="kpiTileRow kpiTileRow--four">
          <KPI label="Total txs · all" value={fmtN(a.rows[0]?.all ?? 0)} />
          <KPI label="Succeeded · all" value={fmtN(a.rows[1]?.all ?? 0)} />
          <KPI label="Success rate · all" value={fmtPct(a.successRate.all, 1)} hint="Pending excluded" />
          <KPI label="Active users · 24h" value={fmtN(a.rows[3]?.last24h ?? 0)} />
        </div>

        <div className="tabBar" role="tablist">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tabBtn${tab === t.id ? " tabBtn--on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overall" ? (
          <div className="dashTable">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th style={{ textAlign: "right" }}>24h</th>
                  <th style={{ textAlign: "right" }}>7d</th>
                  <th style={{ textAlign: "right" }}>30d</th>
                  <th style={{ textAlign: "right" }}>All</th>
                </tr>
              </thead>
              <tbody>
                {a.rows.map((row) => (
                  <tr key={row.metric} className={row.metric === "Failed" ? "rowFailed" : ""}>
                    <td>{row.metric}</td>
                    <td style={{ textAlign: "right" }}>{fmtN(row.last24h)}</td>
                    <td style={{ textAlign: "right" }}>{fmtN(row.last7d)}</td>
                    <td style={{ textAlign: "right" }}>{fmtN(row.last30d)}</td>
                    <td style={{ textAlign: "right" }}>{fmtN(row.all)}</td>
                  </tr>
                ))}
                <tr>
                  <td>Success rate</td>
                  <td style={{ textAlign: "right" }}>{fmtPct(a.successRate.last24h, 1)}</td>
                  <td style={{ textAlign: "right" }}>{fmtPct(a.successRate.last7d, 1)}</td>
                  <td style={{ textAlign: "right" }}>{fmtPct(a.successRate.last30d, 1)}</td>
                  <td style={{ textAlign: "right" }}>{fmtPct(a.successRate.all, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <BreakdownTable
            col={active.col}
            rows={a.breakdowns[tab as BreakdownKey]}
            linkAsAccount={ACCOUNT_TABS.has(tab as BreakdownKey)}
          />
        )}
      </div>
    </section>
  );
}

function BreakdownTable({
  col,
  rows,
  linkAsAccount,
}: {
  col: string;
  rows: StatusBreakdownRow[];
  linkAsAccount: boolean;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="dashTable">
        <table>
          <thead>
            <tr>
              <th>{col}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="metaHint">No data yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => r.txns));
  const hasOutcome = rows.some((r) => typeof r.succeeded === "number");

  return (
    <div className="dashTable dashTable--scroll">
      <table>
        <thead>
          <tr>
            <th>{col}</th>
            <th style={{ textAlign: "right" }}>Txns · 24h</th>
            {hasOutcome ? <th style={{ textAlign: "right" }}>Succeeded</th> : null}
            {hasOutcome ? <th style={{ textAlign: "right" }}>Failed</th> : null}
            {hasOutcome ? <th style={{ textAlign: "right" }}>Success rate</th> : null}
            <th style={{ width: "22%" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sharePct = max > 0 ? (r.txns / max) * 100 : 0;
            const successPct = r.successPct ?? null;
            const sucTone =
              successPct == null
                ? "ok"
                : successPct >= 98
                  ? "ok"
                  : successPct >= 95
                    ? "warn"
                    : "err";
            return (
              <tr key={r.label}>
                <td>
                  {linkAsAccount ? (
                    <NearblocksLink kind="account" value={r.label}>
                      <code>{r.label}</code>
                    </NearblocksLink>
                  ) : (
                    <code>{r.label}</code>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>{fmtN(r.txns)}</td>
                {hasOutcome ? (
                  <td style={{ textAlign: "right" }}>{fmtN(r.succeeded ?? null)}</td>
                ) : null}
                {hasOutcome ? (
                  <td style={{ textAlign: "right" }} className={(r.failed ?? 0) > 0 ? "metaErr" : ""}>
                    {fmtN(r.failed ?? null)}
                  </td>
                ) : null}
                {hasOutcome ? (
                  <td style={{ textAlign: "right" }}>
                    <span className={`successPct successPct--${sucTone}`}>{fmtPct(successPct, 1)}</span>
                  </td>
                ) : null}
                <td>
                  <span className="shareBar">
                    <span style={{ width: `${sharePct}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="kpiTile">
      <span className="kpiLabel">{label}</span>
      <span className="kpiValue">{value}</span>
      {hint ? <span className="kpiHint">{hint}</span> : null}
    </div>
  );
}
