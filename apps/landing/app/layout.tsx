import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "https://fast-auth-landing.vercel.app";
}

const SITE_URL = resolveSiteUrl();
const SITE_TITLE = "FastAuth — Sign up with email. Own a real wallet.";
const SITE_DESCRIPTION =
  "FastAuth onboards users in seconds via Auth0 — Google, Apple, email/password, or passkey — no seed phrases, no extensions, no wallet popups. A real NEAR account, derived from the user's identity through MPC.";
const OG_IMAGE = "/fast-auth-img-og.png";
const OG_IMAGE_ALT = "FastAuth — One login. Every dApp on NEAR.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/brand/fastauth-mark.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FastAuth",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9HVGE9PZ10"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
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
