import type { Metadata } from "next";
import Script from "next/script";

import { resolveSiteUrl } from "@/lib/site-url";

import "./globals.css";

const SITE_URL = resolveSiteUrl();
const SITE_TITLE = "NEAR Auth — Sign in with Google or Apple on NEAR · Social-login Web3 onboarding";
const SITE_DESCRIPTION =
  "NEAR Auth is the Web3 onboarding layer for NEAR dApps: sign in with Google, Apple, email, or passkey and land on a real NEAR wallet — non-custodial via MPC, gasless through NEP-366 meta-transactions. Built and operated by Peersyst.";
const SITE_NAME = "NEAR Auth";
const OG_IMAGE = "/fast-auth-img-og.png";
const OG_IMAGE_ALT = "NEAR Auth — Sign in with Google or Apple on NEAR";
const PEERSYST_URL = "https://peersyst.com";
const PEERSYST_LOGO = "https://peersyst.com/favicon.ico";
const DOCS_URL = "https://docs.auth.near.org/";

const SEO_KEYWORDS = [
  "NEAR social login",
  "Sign in with Google NEAR",
  "Sign in with Apple NEAR",
  "Web3 onboarding NEAR",
  "MPC wallet NEAR",
  "non-custodial NEAR wallet",
  "Auth0 NEAR",
  "NEP-366 meta-transactions",
  "NEAR Auth",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SEO_KEYWORDS,
  authors: [{ name: "Peersyst", url: PEERSYST_URL }],
  creator: "Peersyst",
  publisher: "Peersyst",
  category: "technology",
  icons: {
    icon: "/brand/NEARAuth_logo_square.svg",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1000,
        height: 583,
        alt: OG_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, alt: OG_IMAGE_ALT }],
  },
};

// JSON-LD blocks are rendered server-side via dangerouslySetInnerHTML rather
// than next/script. Strategy-based loaders (afterInteractive / lazyOnload)
// delay execution past the point most crawlers read the DOM, and JSON-LD
// must be in the initial HTML for Google to pick it up. This is the pattern
// recommended in Next.js' "JSON-LD" guide.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${PEERSYST_URL}/#organization`,
  name: "Peersyst",
  url: PEERSYST_URL,
  logo: PEERSYST_LOGO,
  sameAs: [
    "https://github.com/Peersyst",
    "https://x.com/Peersyst",
    "https://www.linkedin.com/company/peersyst-technology",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": `${PEERSYST_URL}/#organization` },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web Browser",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${PEERSYST_URL}/#organization` },
  softwareHelp: { "@type": "CreativeWork", url: DOCS_URL },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* GA loads from googletagmanager.com after lazyOnload (post-window-onload).
            Preconnect + DNS prefetch shave the TLS / DNS round-trip off the first
            beacon without pulling the script earlier into the critical path. */}
        <link
          rel="preconnect"
          href="https://www.googletagmanager.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <script
          type="application/ld+json"
          // JSON-LD payload is a static object built above; JSON.stringify
          // is the canonical way Next.js docs recommend injecting it.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
      </head>
      <body>{children}</body>
      {/* lazyOnload pushes GA execution past window.onload so the ~64 KiB GTM
          bundle never blocks LCP / TBT on this informational landing. The
          initial pageview still fires (gtag config runs after load), which is
          acceptable for analytics on a non-conversion-critical first paint. */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9HVGE9PZ10"
        strategy="lazyOnload"
      />
      <Script id="gtag-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9HVGE9PZ10');
        `}
      </Script>
    </html>
  );
}
