import { ArrowRight } from "./icons";

type Props = { docsHref: string; applyHref: string };

export default function FooterCTA({ docsHref, applyHref }: Props) {
  return (
    <section className="footerCTA">
      <div className="container">
        <h2>
          Ship the wallet your users<br />won't realize they're using.
        </h2>
        <p>
          Build on testnet today — no approval needed. When you're ready for production, submit your application to get whitelisted Auth0 credentials and mainnet access.
        </p>
        <div className="footerCTAButtons">
          <a href={docsHref} className="btn btn--primary">
            Start on testnet <ArrowRight />
          </a>
          <a href={applyHref} target="_blank" rel="noopener" className="btn btn--ghost">
            Submit your application <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
