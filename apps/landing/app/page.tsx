import AuditBanner from "@/components/AuditBanner";
import DeveloperSection from "@/components/DeveloperSection";
import FAQ from "@/components/FAQ";
import FooterCTA from "@/components/FooterCTA";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import SiteFooter from "@/components/SiteFooter";
import Stats from "@/components/Stats";
import WhatIsFastAuth from "@/components/WhatIsFastAuth";
import { fetchLiveMetrics } from "@/lib/metrics";

const DOCS_HREF = "https://peersyst.github.io/fast-auth/";
const STATUS_HREF = "/status";
const AUDIT_HREF =
  "https://peersyst-public-production.s3.eu-west-1.amazonaws.com/FastAuth_Halborn.pdf";
const APPLY_HREF =
  "https://peersyst.github.io/fast-auth/docs/guides/submit-your-application";

export const revalidate = 60;

export default async function Page() {
  const metrics = await fetchLiveMetrics();

  return (
    <>
      <Header docsHref={DOCS_HREF} statusHref={STATUS_HREF} />
      <Hero
        docsHref={DOCS_HREF}
        statusHref={STATUS_HREF}
        auditHref={AUDIT_HREF}
      />
      <AuditBanner auditHref={AUDIT_HREF} />
      <WhatIsFastAuth />
      <HowItWorks />
      <DeveloperSection docsHref={DOCS_HREF} />
      <Stats metrics={metrics} statusHref={STATUS_HREF} />
      <FAQ />
      <FooterCTA docsHref={DOCS_HREF} applyHref={APPLY_HREF} />
      <SiteFooter docsHref={DOCS_HREF} statusHref={STATUS_HREF} auditHref={AUDIT_HREF} />
    </>
  );
}
