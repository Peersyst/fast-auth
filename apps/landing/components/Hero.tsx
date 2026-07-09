import type { LiveMetrics } from "@/lib/metrics";
import { ArrowRight, ShieldIcon } from "./icons";
import PhoneHero from "./PhoneHero";

type Props = {
  docsHref: string;
  statusHref: string;
  auditHref: string;
  // Optional: when present, the kicker shows the live total accounts;
  // otherwise it falls back to the static "10M+ ACCOUNTS" copy.
  metrics?: LiveMetrics | null;
};

const COMPACT_MILLIONS = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 0,
});

// Marketing kicker: floor to the nearest million so the trailing "+" stays
// truthful — e.g. 10.7M displays as "10M+" (at least 10M), not "11M+".
function buildAccountsLabel(total: number | null | undefined): string {
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) {
    return "10M+ ACCOUNTS";
  }
  const rounded = Math.max(10_000_000, Math.floor(total / 1_000_000) * 1_000_000);
  return `${COMPACT_MILLIONS.format(rounded)}+ ACCOUNTS`;
}

export default function Hero({ docsHref, statusHref, auditHref, metrics }: Props) {
  const accountsLabel = buildAccountsLabel(metrics?.accounts.total);

  return (
    <section className="hero">
      <div className="container heroGrid">
        <div className="heroCopy">
          <span className="heroKicker">
            <span className="kdot" />
            FASTAUTH · LIVE ON NEAR MAINNET · {accountsLabel}
          </span>
          <h1 className="heroTitle">
            Onboard users with an <span className="accent">email</span>.{" "}
            Give them a <span className="accent">real wallet</span>.
          </h1>
          <p className="heroLede">
            FastAuth onboards users in seconds with any Auth0 method — email, social, passkey, or enterprise SSO — no seed phrases, no extensions, no wallet popups.
            One Auth0-backed identity, shared across every wallet and dApp in the NEAR ecosystem that integrates FastAuth.
          </p>

          <div className="heroCTAs">
            <a href={docsHref} className="btn btn--primary">
              Get started <ArrowRight />
            </a>
            <a href={statusHref} className="btn btn--dark">
              <span className="heroDot" />
              FastAuth status
              <ArrowRight />
            </a>
          </div>

          <div className="heroMeta">
            <span><span className="check">✓</span> Email · Social · Passkey · SSO</span>
            <span><span className="check">✓</span> Shared identity across NEAR</span>
            <a href={auditHref} target="_blank" rel="noopener" className="auditPill">
              <ShieldIcon /> Audited by <b>Halborn</b> · view report
            </a>
          </div>
        </div>

        <div className="heroVisual">
          <PhoneHero />
        </div>
      </div>
    </section>
  );
}
