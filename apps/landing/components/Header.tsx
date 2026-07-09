import { ArrowRight, DocIcon } from "./icons";
import { NearAuthLogo } from "./NearAuthLogo";

type Props = { docsHref: string; statusHref: string };

export default function Header({ docsHref, statusHref }: Props) {
  return (
    <header className="siteHeader">
      <div className="container headerInner">
        <a href="/" className="brand">
          <NearAuthLogo />
          <span className="by">Peersyst × NEAR</span>
        </a>
        <nav className="nav">
          <a className="navLink" href={docsHref}>
            <DocIcon /> Docs
          </a>
          <a className="navLink navLink--status" href={statusHref}>
            <span className="liveDot" /> Status
          </a>
          <a className="navLink" href="#how">How it works</a>
          <a className="navLink" href="#faq">FAQ</a>
          <a className="headerCTA" href={docsHref}>
            Get started <ArrowRight />
          </a>
        </nav>
      </div>
    </header>
  );
}
