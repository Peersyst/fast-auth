import type { StatusData } from "@/lib/status";
import SectionLabel from "./SectionLabel";
import UptimeBar from "./UptimeBar";
import { fmtAbsolute, fmtN, fmtPct, relativeTime } from "./format";

export default function ServiceHealth({ data }: { data: StatusData }) {
  const fa = data.fastAuthHealth;
  const mpc = data.mpcHealth;

  return (
    <section className="dashSection">
      <div className="container">
        <SectionLabel num="01" title="Status" hint="Live signing pipeline · MPC + FastAuth router" />
        <div className="healthGrid">
          <article className="healthCard">
            <div className="healthCardHead">
              <h3>Fast Auth Status</h3>
              <span className="healthBadge healthBadge--ok">{fmtPct(fa?.successRatePct ?? null, 0)}</span>
            </div>
            {fa ? (
              <dl className="healthMeta">
                <div>
                  <dt>Window</dt>
                  <dd>
                    <code className="hashCode">#{fmtN(Number(fa.windowStartHeight))}</code> –{" "}
                    <code className="hashCode">#{fmtN(Number(fa.windowEndHeight))}</code>{" "}
                    <span className="metaHint">({fmtN(fa.windowBlocks)} blocks)</span>
                  </dd>
                </div>
                <div>
                  <dt>Tx in window</dt>
                  <dd>
                    {fmtN(fa.successful)} ok / <span className="metaErr">{fmtN(fa.failed)} failed</span> /{" "}
                    {fmtN(fa.rpcPending)} pending{" "}
                    <span className="metaHint">({fmtN(fa.total)} total)</span>
                  </dd>
                </div>
                <div>
                  <dt>Guard-side failures</dt>
                  <dd>{fmtN(fa.guardFailed)}</dd>
                </div>
                <div>
                  <dt>Last success</dt>
                  <dd>
                    {fmtAbsolute(fa.lastSuccessAt)} <span className="metaHint">({relativeTime(fa.lastSuccessAt)})</span>
                  </dd>
                </div>
                <div>
                  <dt>Computed at</dt>
                  <dd>{fmtAbsolute(fa.computedAt)}</dd>
                </div>
              </dl>
            ) : (
              <p className="healthFootnote">No FastAuth health snapshot yet.</p>
            )}
            <UptimeBar
              data={data.uptime24h.map((p) => p.fastAuth)}
              label="Last 24h"
              anchor={data.generatedAt}
            />
            <p className="healthFootnote">
              Last 24h of FastAuth txs, classified by walking each tx&apos;s receipts. Share whose full receipt chain
              (guard → MPC) executed cleanly. Pending tx are excluded from the denominator until classified.
            </p>
          </article>

          <article className="healthCard">
            <div className="healthCardHead">
              <h3>MPC Status</h3>
              <span className="healthBadge healthBadge--ok">{fmtPct(mpc?.successRatePct ?? null, 0)}</span>
            </div>
            {mpc ? (
              <dl className="healthMeta">
                <div>
                  <dt>MPC attempts</dt>
                  <dd>{fmtN(mpc.attempted)}</dd>
                </div>
                <div>
                  <dt>MPC successes</dt>
                  <dd>{fmtN(mpc.successful)}</dd>
                </div>
                <div>
                  <dt>MPC failures</dt>
                  <dd className="metaErr">{fmtN(mpc.failed)}</dd>
                </div>
                <div>
                  <dt>RPC pending</dt>
                  <dd>{fmtN(mpc.rpcPending)}</dd>
                </div>
                <div>
                  <dt>Computed at</dt>
                  <dd>{fmtAbsolute(mpc.computedAt)}</dd>
                </div>
              </dl>
            ) : (
              <p className="healthFootnote">No MPC health snapshot yet.</p>
            )}
            <UptimeBar
              data={data.uptime24h.map((p) => p.mpc)}
              label="Last 24h"
              anchor={data.generatedAt}
            />
            <p className="healthFootnote">
              Success rate of MPC signing receipts. Excludes guard-side rejections to isolate MPC network health.
              Pending tx are excluded from the denominator until classified.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
