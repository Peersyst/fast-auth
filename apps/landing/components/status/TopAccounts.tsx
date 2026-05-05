"use client";

import { useState } from "react";

import type { StatusData } from "@/lib/status";
import NearblocksLink from "./NearblocksLink";
import Pagination from "./Pagination";
import SectionLabel from "./SectionLabel";
import { fmtN, shortAccount } from "./format";

const PAGE_SIZE = 10;

export default function TopAccounts({ data }: { data: StatusData }) {
  const [page, setPage] = useState(0);
  const total = data.topAccounts.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const slice = data.topAccounts.slice(start, start + PAGE_SIZE);

  return (
    <section className="dashSection dashSection--alt">
      <div className="container">
        <SectionLabel
          num="04"
          title="Top accounts signing with fast-auth.near"
          hint={`Ranked by FastAuth.sign() calls · ${fmtN(total)} of ${fmtN(data.topAccountsTotal)}`}
        />

        <div className="dashTable dashTable--scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Account</th>
                <th style={{ textAlign: "right" }}>24h</th>
                <th style={{ textAlign: "right" }}>All time</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((a, i) => (
                <tr key={a.accountId}>
                  <td className="rank">{start + i + 1}</td>
                  <td>
                    <NearblocksLink kind="account" value={a.accountId}>
                      <code>{shortAccount(a.accountId)}</code>
                    </NearblocksLink>
                  </td>
                  <td style={{ textAlign: "right" }}>{fmtN(a.calls24h)}</td>
                  <td style={{ textAlign: "right" }}>{fmtN(a.callsAll)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </section>
  );
}
