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

const STATUS_TITLE = "NEARauth Status — Live NEAR mainnet metrics, MPC signing health, indexer state";
const STATUS_DESCRIPTION =
  "Live NEARauth metrics on NEAR mainnet: MPC and NEARauth signing health, account growth, sign-event volume, top callers, contracts, and indexer state. Updated every minute.";
// Reuse the root OG image; the status page doesn't need a bespoke card and a
// missing image hurts social previews more than a generic one helps them.
const STATUS_OG_IMAGE = "/fast-auth-img-og.png";
const STATUS_OG_IMAGE_ALT = "NEARauth status — live NEAR mainnet metrics";

export const metadata: Metadata = {
  title: STATUS_TITLE,
  description: STATUS_DESCRIPTION,
  alternates: {
    canonical: STATUS_HREF,
  },
  openGraph: {
    type: "website",
    url: STATUS_HREF,
    siteName: "NEARauth",
    title: STATUS_TITLE,
    description: STATUS_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: STATUS_OG_IMAGE,
        width: 1000,
        height: 583,
        alt: STATUS_OG_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: STATUS_TITLE,
    description: STATUS_DESCRIPTION,
    images: [{ url: STATUS_OG_IMAGE, alt: STATUS_OG_IMAGE_ALT }],
  },
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
