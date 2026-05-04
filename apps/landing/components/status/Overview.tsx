import type { StatusData } from "@/lib/status";
import SectionLabel from "./SectionLabel";
import { fmtN, fmtPct } from "./format";

export default function Overview({ data }: { data: StatusData }) {
  const a = data.accounts;
  const t = data.transactions;

  return (
    <section className="dashSection dashSection--alt">
      <div className="container">
        <SectionLabel num="02" title="Overview" hint="Accounts and sign-event volume" />

        <div className="overviewGrid">
          <div className="overviewPanel">
            <div className="overviewHead">
              <h3>Accounts</h3>
              <span className="metaHint">
                Total {fmtN(a.total)} · {fmtN(a.migrated)} migrated + {fmtN(a.indexed)} indexed
              </span>
            </div>
            <div className="kpiTileRow">
              <KPI label="Total" value={fmtN(a.total)} hint="Migrated + indexed" />
              <KPI label="Migrated" value={fmtN(a.migrated)} hint="Legacy FastAuth" />
              <KPI label="Created · 24h" value={fmtN(a.firstSeen.last24h)} />
              <KPI label="Active · 24h" value={fmtN(a.active.last24h)} />
            </div>
            <div className="dashTable">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>24h</th>
                    <th>7d</th>
                    <th>30d</th>
                    <th>All</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Created</td>
                    <td>{fmtN(a.firstSeen.last24h)}</td>
                    <td>{fmtN(a.firstSeen.last7d)}</td>
                    <td>{fmtN(a.firstSeen.last30d)}</td>
                    <td>{fmtN(a.firstSeen.all)}</td>
                  </tr>
                  <tr>
                    <td>Active</td>
                    <td>{fmtN(a.active.last24h)}</td>
                    <td>{fmtN(a.active.last7d)}</td>
                    <td>{fmtN(a.active.last30d)}</td>
                    <td>{fmtN(a.active.all)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="overviewPanel">
            <div className="overviewHead">
              <h3>Sign-events</h3>
              <span className="metaHint">
                Volume per window · {fmtN(t.failed.last24h)} failed · 24h
              </span>
            </div>
            <div className="kpiTileRow kpiTileRow--two">
              <KPI label="Total signed" value={fmtN(t.signed.all)} hint="All time" />
              <KPI
                label="Total failed"
                value={fmtN(t.failed.all)}
                hint="All time"
                tone={t.failed.all > 0 ? "warn" : undefined}
              />
            </div>
            <div className="dashTable">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>24h</th>
                    <th>7d</th>
                    <th>30d</th>
                    <th>All</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Signed</td>
                    <td>{fmtN(t.signed.last24h)}</td>
                    <td>{fmtN(t.signed.last7d)}</td>
                    <td>{fmtN(t.signed.last30d)}</td>
                    <td>{fmtN(t.signed.all)}</td>
                  </tr>
                  <tr className="rowFailed">
                    <td>Failed</td>
                    <td>{fmtN(t.failed.last24h)}</td>
                    <td>{fmtN(t.failed.last7d)}</td>
                    <td>{fmtN(t.failed.last30d)}</td>
                    <td>{fmtN(t.failed.all)}</td>
                  </tr>
                  <tr>
                    <td>Total</td>
                    <td>{fmtN(t.total.last24h)}</td>
                    <td>{fmtN(t.total.last7d)}</td>
                    <td>{fmtN(t.total.last30d)}</td>
                    <td>{fmtN(t.total.all)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {data.actionTypes.length > 0 ? (
          <div className="splitPanel">
            <div className="splitPanelHead">
              <h4>Action types · 24h</h4>
              <span className="metaHint">By signed action</span>
            </div>
            <ul className="actionList">
              {data.actionTypes.map((a) => (
                <li key={a.name}>
                  <span className="actionLabel">{a.name}</span>
                  <span className="actionBar">
                    <span style={{ width: `${a.pct}%` }} />
                  </span>
                  <span className="actionPct">{fmtPct(a.pct, 1)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KPI({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "err";
}) {
  return (
    <div className={`kpiTile${tone ? ` kpiTile--${tone}` : ""}`}>
      <span className="kpiLabel">{label}</span>
      <span className="kpiValue">{value}</span>
      {hint ? <span className="kpiHint">{hint}</span> : null}
    </div>
  );
}
