export default function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="container">
        <div className="sectionHead">
          <div>
            <p className="sectionKicker"><span className="kn">02</span>  How it works</p>
            <h2 className="sectionTitle">Three steps. No seed phrases. Any login.</h2>
          </div>
          <p className="sectionLede">
            What the user sees, and what's happening on chain. From login to confirmed transaction — without the user ever holding a key.
          </p>
        </div>

        <div className="stepsGrid">
          <article className="stepCard">
            <div className="stepNum"><b>STEP 01</b> Authenticate</div>
            <h3>User signs in. Auth0 issues a JWT.</h3>
            <p>
              The user logs in with email/password, a passkey, Google, or Apple. Auth0 returns a
              JWT whose <code>sub</code> claim uniquely identifies them. Every transaction reuses
              this login — a fresh JWT is issued for each one, with the action embedded in the
              payload.
            </p>
            <div className="stepVis">
              <span style={{ color: "var(--color-ink-subtle)" }}>→ POST /authorize</span>
              <span>
                <span style={{ color: "var(--color-status-ok)" }}>200</span> · jwt issued ·{" "}
                <span style={{ color: "var(--color-ink-subtle)" }}>sub=google-oauth2|…</span>
              </span>
            </div>
          </article>

          <article className="stepCard">
            <div className="stepNum"><b>STEP 02</b> Derive &amp; sign</div>
            <h3>The MPC network derives the user's key from their JWT.</h3>
            <p>
              The FastAuth contract routes the JWT to the matching guard (Auth0, Firebase, custom
              issuer) for cryptographic verification. On success it builds a deterministic path —{" "}
              <code>{"{guard_id}#{sub}"}</code> — and asks NEAR's MPC network to sign for it. The
              nodes derive the same key for the same identity every time, and produce the
              signature collaboratively. No single party ever holds the full key — and the user
              holds no key material at all.
            </p>
            <div className="stepVis">
              <span>
                <span style={{ color: "var(--color-ink-subtle)" }}>guard.verify(jwt)</span>{" "}
                <span style={{ color: "var(--color-status-ok)" }}>✓</span>
              </span>
              <span style={{ color: "var(--color-ink-subtle)" }}>path jwt#auth0#… → v1.signer</span>
              <span>
                <span style={{ color: "var(--color-status-ok)" }}>signed</span> ·{" "}
                <span style={{ color: "var(--color-ink-subtle)" }}>eddsa</span>
              </span>
            </div>
          </article>

          <article className="stepCard">
            <div className="stepNum"><b>STEP 03</b> Transact</div>
            <h3>Gasless meta-transactions land on chain.</h3>
            <p>
              The MPC signature wraps the user's action as a NEP-366 DelegateAction. Your dApp's
              relayer pays gas, the action is bound to the JWT's payload (so it can't be
              re-used), and the call lands on NEAR mainnet through the relayer.
            </p>
            <div className="stepVis">
              <span style={{ color: "var(--color-ink-subtle)" }}>delegate action → relayer</span>
              <span>
                <span style={{ color: "var(--color-status-ok)" }}>included</span> · block 210,481,902
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
