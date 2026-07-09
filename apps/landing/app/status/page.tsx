import type { Metadata } from "next";

import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import Activity from "@/components/status/Activity";
import Contracts from "@/components/status/Contracts";
import Failures from "@/components/status/Failures";
import Indexer from "@/components/status/Indexer";
import Overview from "@/components/status/Overview";
import ServiceHealth from "@/components/status/ServiceHealth";
import StatusBanner from "@/components/status/StatusBanner";
import StatusUnavailable from "@/components/status/StatusUnavailable";
import TopAccounts from "@/components/status/TopAccounts";
import { fetchStatusData } from "@/lib/status";

const DOCS_HREF = "https://peersyst.github.io/fast-auth/";
const STATUS_HREF = "/status";
const AUDIT_HREF =
  "https://peersyst-public-production.s3.eu-west-1.amazonaws.com/FastAuth_Halborn.pdf";

export const metadata: Metadata = {
  title: "FastAuth · Status",
  description:
    "Live FastAuth metrics on NEAR mainnet. MPC and FastAuth signing health, accounts, sign-events, top callers, contracts, and indexer state.",
};

export const revalidate = 60;

export default async function StatusPage() {
  const data = await fetchStatusData();

  return (
    <>
      <Header docsHref={DOCS_HREF} statusHref={STATUS_HREF} />
      <main className="statusMain">
        {data ? (
          <>
            <StatusBanner data={data} />
            <ServiceHealth data={data} />
            <Overview data={data} />
            <Activity data={data} />
            <TopAccounts data={data} />
            <Failures data={data} />
            <Contracts data={data} />
            <Indexer data={data} />
          </>
        ) : (
          <StatusUnavailable />
        )}
      </main>
      <SiteFooter docsHref={DOCS_HREF} statusHref={STATUS_HREF} auditHref={AUDIT_HREF} />
    </>
  );
}
