import type { StatusData } from "@/lib/status";
import NearblocksLink from "./NearblocksLink";
import SectionLabel from "./SectionLabel";
import {
  fmtAbsolute,
  fmtKbFromBytes,
  fmtNearFromYocto,
  relativeTime,
  shortHash,
} from "./format";

export default function Contracts({ data }: { data: StatusData }) {
  return (
    <section className="dashSection dashSection--alt">
      <div className="container">
        <SectionLabel
          num="06"
          title="FastAuth Contracts"
          hint={
            data.contractsTrackedSince
              ? `Live view-call snapshot · history since ${fmtAbsolute(data.contractsTrackedSince)}`
              : "Live view-call snapshot"
          }
        />

        <div className="dashTable dashTable--scroll">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th style={{ textAlign: "right" }}>Storage</th>
                <th>Code hash</th>
                <th>Version</th>
                <th>Owner</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {data.contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="contractCell">
                      <span className="contractCellKind">
                        <span className="statusDot statusDot--ok" />
                        {c.kind}
                      </span>
                      <NearblocksLink kind="account" value={c.id}>
                        <code>{c.id}</code>
                      </NearblocksLink>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {fmtNearFromYocto(c.balanceYocto)} <span className="metaHint">Ⓝ</span>
                  </td>
                  <td style={{ textAlign: "right" }}>{fmtKbFromBytes(c.storageBytes)}</td>
                  <td>
                    <code className="codeHash" title={c.codeHash ?? undefined}>
                      {shortHash(c.codeHash)}
                    </code>
                  </td>
                  <td>{c.version ?? "—"}</td>
                  <td>
                    {c.owner ? (
                      <NearblocksLink kind="account" value={c.owner}>
                        <code className="ownerCode">{c.owner}</code>
                      </NearblocksLink>
                    ) : (
                      <code className="ownerCode">—</code>
                    )}
                  </td>
                  <td title={fmtAbsolute(c.snapshotAt)}>{relativeTime(c.snapshotAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
