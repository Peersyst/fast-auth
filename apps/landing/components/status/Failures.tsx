"use client";

import { useState } from "react";

import type { StatusData } from "@/lib/status";
import NearblocksLink from "./NearblocksLink";
import Pagination from "./Pagination";
import RelativeTime from "./RelativeTime";
import SectionLabel from "./SectionLabel";
import { fmtAbsolute, shortHash } from "./format";

const PAGE_SIZE = 8;
const KIND_LABEL: Record<string, string> = {
  guard_failure: "Guard",
  mpc_failure: "MPC",
  other: "Other",
};

export default function Failures({ data }: { data: StatusData }) {
  const [page, setPage] = useState(0);
  const rows = data.recentFailures;
  if (rows.length === 0) {
    return (
      <section className="dashSection">
        <div className="container">
          <SectionLabel num="05" title="Recent failures" hint={data.recentFailuresWindow} />
          <p className="trackingSince">No failures in the current window. ✓</p>
        </div>
      </section>
    );
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);

  return (
    <section className="dashSection">
      <div className="container">
        <SectionLabel num="05" title="Recent failures" hint={data.recentFailuresWindow} />

        <div className="failuresList">
          {slice.map((f, i) => (
            <div key={start + i} className="failureRow">
              <span className="failureWhen" title={fmtAbsolute(f.at)}>
                <RelativeTime iso={f.at} />
              </span>
              <span className={`failureKind failureKind--${f.kind}`}>
                {KIND_LABEL[f.kind] || f.kind}
              </span>
              <span className="failureExecutor">
                {f.executor && f.executor !== "—" ? (
                  <NearblocksLink kind="account" value={f.executor}>
                    <code>{f.executor}</code>
                  </NearblocksLink>
                ) : (
                  <code>—</code>
                )}
              </span>
              <span className="failureReason">{f.reason}</span>
              <span className="failureTx">
                <NearblocksLink kind="tx" value={f.txHash}>
                  <code>{shortHash(f.txHash, 6, 4)}</code>
                </NearblocksLink>
              </span>
            </div>
          ))}
        </div>

        <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </section>
  );
}
