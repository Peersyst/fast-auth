import { ArrowRight } from "./icons";

export default function AuditBanner({ auditHref }: { auditHref: string }) {
  return (
    <section className="auditBanner">
      <div className="container">
        <div className="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L4 5v7c0 4.5 3.4 8.5 8 9.5 4.6-1 8-5 8-9.5V5l-8-3z" />
            <path d="M8 12l3 3 5-6" />
          </svg>
        </div>
        <div className="copy">
          <span className="kicker">Security · Audit</span>
          <span className="title">
            FastAuth smart contracts audited by <b>Halborn</b>.
          </span>
        </div>
        <a href={auditHref} target="_blank" rel="noopener" className="cta">
          Read the security report <ArrowRight />
        </a>
      </div>
    </section>
  );
}
