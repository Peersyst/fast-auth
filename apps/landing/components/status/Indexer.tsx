import type { StatusData } from "@/lib/status";
import SectionLabel from "./SectionLabel";
import { fmtAbsolute, fmtN, relativeTime } from "./format";

export default function Indexer({ data }: { data: StatusData }) {
  const ix = data.indexer;
  const ranges = data.missingRanges;
  const lagOk = (ix.blocksBehind ?? 9_999) <= 150;
  const openRanges = ranges.filter((r) => r.status === "open");

  return (
    <section className="dashSection">
      <div className="container">
        <SectionLabel num="07" title="Indexer status" hint="Lag, scanned range, missing blocks" />

        <div className="healthGrid">
          <article className="healthCard">
            <div className="healthCardHead">
              <h3>Indexer lag</h3>
              <span className={`healthBadge healthBadge--${lagOk ? "ok" : "warn"}`}>
                {fmtN(ix.blocksBehind)} blocks
              </span>
            </div>
            <dl className="healthMeta">
              <div>
                <dt>Chain head</dt>
                <dd>
                  <code className="hashCode">#{fmtN(Number(ix.chainHead))}</code>
                </dd>
              </div>
              <div>
                <dt>Scanned to</dt>
                <dd>
                  <code className="hashCode">#{fmtN(Number(ix.scannedHeight))}</code>
                </dd>
              </div>
              <div>
                <dt>Scanned from</dt>
                <dd>
                  <code className="hashCode">#{fmtN(Number(ix.backfillStartHeight))}</code>
                </dd>
              </div>
              <div>
                <dt>Time behind</dt>
                <dd>
                  {ix.minutesBehind == null
                    ? "—"
                    : ix.minutesBehind === 0
                      ? "<1m"
                      : `${ix.minutesBehind}m`}
                </dd>
              </div>
              <div>
                <dt>Last block</dt>
                <dd title={fmtAbsolute(ix.latestIndexedAt)}>{relativeTime(ix.latestIndexedAt)}</dd>
              </div>
            </dl>
            <p className="healthFootnote">
              Gap between chain head and the last height the indexer has fully scanned.
            </p>
          </article>

          <article className="healthCard">
            <div className="healthCardHead">
              <h3>Missing block ranges</h3>
              <span className={`healthBadge healthBadge--${openRanges.length === 0 ? "ok" : "warn"}`}>
                {openRanges.length} open
              </span>
            </div>
            <dl className="healthMeta">
              <div>
                <dt>Pending</dt>
                <dd>{fmtN(ranges.reduce((s, r) => s + r.pending, 0))} blocks</dd>
              </div>
              <div>
                <dt>Processed</dt>
                <dd>{fmtN(ranges.reduce((s, r) => s + r.processed, 0))} blocks</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>Pre-existing + RPC pruned</dd>
              </div>
              <div>
                <dt>Resolution</dt>
                <dd>Archival backfill</dd>
              </div>
            </dl>
            <p className="healthFootnote">
              Open ranges trigger an archival backfill (<code>pnpm backfill:range</code>).
            </p>
          </article>
        </div>

        {ranges.length > 0 ? (
          <div className="dashTable dashTable--scroll" style={{ marginTop: 24 }}>
            <table>
              <thead>
                <tr>
                  <th>Range</th>
                  <th style={{ textAlign: "right" }}>Size</th>
                  <th style={{ textAlign: "right" }}>Processed</th>
                  <th style={{ textAlign: "right" }}>Pending</th>
                  <th>Status</th>
                  <th>Recorded</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((r) => (
                  <tr key={`${r.startHeight}-${r.endHeight}`}>
                    <td>
                      <code className="hashCode">
                        #{fmtN(r.startHeight)} – #{fmtN(r.endHeight)}
                      </code>
                    </td>
                    <td style={{ textAlign: "right" }}>{fmtN(r.size)}</td>
                    <td style={{ textAlign: "right" }}>
                      {fmtN(r.processed)} <span className="metaHint">({r.pctProcessed}%)</span>
                    </td>
                    <td style={{ textAlign: "right" }}>{fmtN(r.pending)}</td>
                    <td>
                      <span
                        className={`healthBadge healthBadge--${r.status === "open" ? "warn" : "ok"} rangeBadge`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td title={fmtAbsolute(r.recordedAt)}>{relativeTime(r.recordedAt)}</td>
                    <td className="rangeReason">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
