import type { StatusData } from "@/lib/status";
import SectionLabel from "./SectionLabel";
import { fmtAbsolute, fmtN, relativeTime } from "./format";

export default function Indexer({ data }: { data: StatusData }) {
  const ix = data.indexer;
  const lagOk = (ix.blocksBehind ?? 9_999) <= 150;

  return (
    <section className="dashSection">
      <div className="container">
        <SectionLabel num="07" title="Indexer status" hint="Lag and scanned range" />

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
        </div>
      </div>
    </section>
  );
}
