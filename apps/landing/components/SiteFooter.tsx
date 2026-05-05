type Props = { docsHref: string; statusHref: string; auditHref: string };

export default function SiteFooter({ docsHref, statusHref, auditHref }: Props) {
  return (
    <footer className="siteFooter">
      <div className="container">
        <div className="footerGrid">
          <div className="footerCol">
            <a href="/" className="brand" style={{ marginBottom: 12 }}>
              <img src="/brand/fastauth-mark.svg" alt="FastAuth" />
              <span className="wordmark">FastAuth</span>
            </a>
            <p>An account-abstraction layer for NEAR. Built and operated by Peersyst.</p>
          </div>
          <div className="footerCol">
            <h4>Product</h4>
            <ul>
              <li><a href={docsHref}>Documentation</a></li>
              <li><a href="https://peersyst.github.io/fast-auth/docs/guides/select-your-sdk" target="_blank" rel="noopener">SDK</a></li>
              <li><a href={statusHref}>Status</a></li>
            </ul>
          </div>
          <div className="footerCol">
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="https://github.com/Peersyst/fast-auth" target="_blank" rel="noopener">
                  GitHub
                </a>
              </li>
              <li>
                <a href={auditHref} target="_blank" rel="noopener">
                  Halborn audit
                </a>
              </li>
              <li>
                <a
                  href="https://peersyst.github.io/fast-auth/docs/concepts/architecture_custom_issuer_service"
                  target="_blank"
                  rel="noopener"
                >
                  Custom Issuer
                </a>
              </li>
            </ul>
          </div>
          <div className="footerCol">
            <h4>Company</h4>
            <ul>
              <li><a href="https://peersyst.com/" target="_blank" rel="noopener">Peersyst</a></li>
              <li><a href="https://www.near.org/" target="_blank" rel="noopener">NEAR Protocol</a></li>
              <li><a href="https://discord.gg/JZfwEt82ur" target="_blank" rel="noopener">Contact</a></li>
              <li><a href="https://x.com/NEARProtocol" target="_blank" rel="noopener">Twitter / X</a></li>
            </ul>
          </div>
        </div>
        <div className="footerBottom">
          <span>© 2026 Peersyst Technology</span>
          <span className="pill"><span className="pd" /> All systems operational</span>
        </div>
      </div>
    </footer>
  );
}
