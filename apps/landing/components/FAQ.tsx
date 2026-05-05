// Native HTML <details>/<summary> for the FAQ — no client interactivity
// needed. The browser toggles the expanded state on its own; this works
// reliably on every mobile browser (and screen readers / assistive tech) with
// zero React state, zero event handlers. The first item is `open` by default
// to mirror the prior UI's initial state.
import { PlusIcon } from "./icons";

const ITEMS = [
  {
    q: "What chain does FastAuth run on?",
    a: "NEAR Protocol mainnet. FastAuth is built and operated by Peersyst as a public-good account-abstraction layer for the NEAR ecosystem. Accounts are real NEAR named accounts you can inspect on nearblocks.io.",
  },
  {
    q: "How do users sign in?",
    a: "Through Auth0 — Google, Apple, email/password, or passkey. The user's MPC-controlled NEAR account is derived deterministically from their Auth0 identity, so the same login always resolves to the same account no matter which FastAuth dApp they sign into.",
  },
  {
    q: "What does Auth0 have to do with it?",
    a: "Auth0 is the identity layer. Each FastAuth-integrated dApp gets its own approved Auth0 credentials (domain, clientId, audience), but the user's `sub` claim deterministically derives the same MPC-controlled NEAR account across every dApp that uses the Auth0 guard — so the same login reaches the same wallet.",
  },
  {
    q: "Where is the user's key stored?",
    a: "User signs in. Auth0 issues a JWT. The MPC network derives the user's key from their JWT. The FastAuth contract routes the JWT to the matching guard (Auth0, Firebase, custom issuer) for cryptographic verification. On success it builds a deterministic path — {guard_id}#{sub} — and asks NEAR's MPC network to sign for it. The nodes derive the same key for the same identity every time, and produce the signature collaboratively. No single party ever holds the full key — and the user holds no key material at all.",
  },
  {
    q: "Is this custodial?",
    a: "No single party holds the user's signing key. The key is derived inside NEAR's MPC network from the user's Auth0-verified identity each time a signature is needed — no node ever reconstructs the full key. The gating credential is the user's Auth0 login: every transaction requires a fresh, verified JWT, and FastAuth cannot sign without it.",
  },
  {
    q: "How is gas paid?",
    a: "Through the FastAuth relayer. When your dApp calls signAndSendDelegateAction, the relayer wraps the user's signed delegate action as a NEP-366 meta-transaction, pays gas on chain, and returns the result — the user pays nothing. The relayer URL is configured per-network in the SDK. For a regular (non-delegate) transaction, the user's account pays gas directly.",
  },
  {
    q: "How do I go live on mainnet?",
    a: "Build on testnet first — no approval required, free credentials. When you're ready for production, submit your application (name, description, expected volume, use case, contact) to the FastAuth team. Once approved, you receive production Auth0 credentials (domain, clientId, audience) and access to the mainnet FastAuth contracts. Mainnet usage is whitelisted to keep the shared infrastructure healthy.",
  },
  {
    q: "Can I self-host?",
    a: "Partially. The FastAuth contract, the JWT Guard Router, and NEAR's MPC network are shared infrastructure deployed on mainnet (fast-auth.near, jwt.fast-auth.near, v1.signer) — you integrate with them, you don't redeploy them. You can self-host the auth side: deploy your own guard contract that implements the JwtGuard trait, or run an off-chain issuer whose JWTs are verified by CustomIssuerGuard. Both extension points are documented.",
  },
  {
    q: "Has FastAuth been audited?",
    a: "Yes. The FastAuth smart contracts and signing infrastructure have been audited by Halborn, an independent security firm specializing in Web3. The full security report is publicly available.",
  },
  {
    q: "Which sign-in methods are supported?",
    a: "Four, all routed through Auth0: Google, Apple, email/password, and passkeys. Because the user's NEAR account is derived deterministically from their Auth0 `sub` claim, the same login resolves to the same account in every FastAuth dApp. For providers Auth0 doesn't cover, you can deploy a custom guard contract or run a custom issuer service that issues JWTs verified on chain.",
  },
];

export default function FAQ() {
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faqGrid">
          <div>
            <p className="sectionKicker"><span className="kn">05</span>  FAQ</p>
            <h2 className="sectionTitle">Questions, answered honestly.</h2>
            <p className="sectionLede" style={{ marginTop: 24 }}>
              If you don't see what you're looking for, the docs go deeper. Or open an issue — we read all of them.
            </p>
          </div>
          <div className="faqList">
            {ITEMS.map((it, i) => (
              <details key={i} className="faqItem" open={i === 0}>
                <summary className="faqQ">
                  <span className="faqQText">{it.q}</span>
                  <span className="plus" aria-hidden="true">
                    <PlusIcon />
                  </span>
                </summary>
                <div className="faqA"><p>{it.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
