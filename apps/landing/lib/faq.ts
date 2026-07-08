// Single source of truth for the FAQ section.
//
// Consumed by:
//   - components/FAQ.tsx          → renders the visible <details> list.
//   - app/page.tsx                → emits the FAQPage JSON-LD for SEO.
//
// Keeping both consumers on the same data prevents drift between what users
// see on the page and what Google indexes from the structured data block.

export type FaqItem = {
  q: string;
  a: string;
};

export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
  {
    q: "Which sign-in methods does NEARauth support?",
    a: "Google, Apple, email/password, and passkeys — all routed through Auth0. Because each user's NEAR account is derived deterministically from their Auth0 `sub` claim, the same login resolves to the same account in every NEARauth dApp. For providers Auth0 doesn't cover, you can deploy a custom guard contract or run a custom issuer service that issues JWTs verified on chain.",
  },
  {
    q: "How does NEARauth compare to Privy, Reown, or Web3Auth?",
    a: "NEARauth is NEAR-native and non-custodial via MPC. Where embedded-wallet products like Privy, Reown (formerly WalletConnect), or Web3Auth rely on proprietary infrastructure (key shards held by the provider, MPC services bound to their stack, or session-key wallets), NEARauth derives a real NEAR named account directly inside NEAR's MPC network from the user's Auth0-verified identity — no single party ever reconstructs the full key. Transactions are dispatched as NEP-366 meta-transactions through an open relayer your dApp configures, and the JWT guard model lets you bring your own issuer if Auth0 doesn't fit. The result: same Google/Apple/email login UX, but on NEAR rails you can audit end-to-end.",
  },
  {
    q: "What chain does NEARauth run on?",
    a: "NEAR Protocol mainnet. NEARauth is built and operated by Peersyst as a public-good account-abstraction layer for the NEAR ecosystem. Accounts are real NEAR named accounts you can inspect on nearblocks.io.",
  },
  {
    q: "How do users sign in?",
    a: "Through Auth0 — Google, Apple, email/password, or passkey. The user's MPC-controlled NEAR account is derived deterministically from their Auth0 identity, so the same login always resolves to the same account no matter which NEARauth dApp they sign into.",
  },
  {
    q: "What does Auth0 have to do with it?",
    a: "Auth0 is the identity layer. Each NEARauth-integrated dApp gets its own approved Auth0 credentials (domain, clientId, audience), but the user's `sub` claim deterministically derives the same MPC-controlled NEAR account across every dApp that uses the Auth0 guard — so the same login reaches the same wallet.",
  },
  {
    q: "Where is the user's key stored?",
    a: "User signs in. Auth0 issues a JWT. The MPC network derives the user's key from their JWT. The NEARauth contract routes the JWT to the matching guard (Auth0, Firebase, custom issuer) for cryptographic verification. On success it builds a deterministic path — {guard_id}#{sub} — and asks NEAR's MPC network to sign for it. The nodes derive the same key for the same identity every time, and produce the signature collaboratively. No single party ever holds the full key — and the user holds no key material at all.",
  },
  {
    q: "Is this custodial?",
    a: "No single party holds the user's signing key. The key is derived inside NEAR's MPC network from the user's Auth0-verified identity each time a signature is needed — no node ever reconstructs the full key. The gating credential is the user's Auth0 login: every transaction requires a fresh, verified JWT, and NEARauth cannot sign without it.",
  },
  {
    q: "How is gas paid?",
    a: "Through the NEARauth relayer. When your dApp calls signAndSendDelegateAction, the relayer wraps the user's signed delegate action as a NEP-366 meta-transaction, pays gas on chain, and returns the result — the user pays nothing. The relayer URL is configured per-network in the SDK. For a regular (non-delegate) transaction, the user's account pays gas directly.",
  },
  {
    q: "How do I go live on mainnet?",
    a: "Build on testnet first — no approval required, free credentials. When you're ready for production, submit your application (name, description, expected volume, use case, contact) to the NEARauth team. Once approved, you receive production Auth0 credentials (domain, clientId, audience) and access to the mainnet NEARauth contracts. Mainnet usage is whitelisted to keep the shared infrastructure healthy.",
  },
  {
    q: "Can I self-host?",
    a: "Partially. The NEARauth contract, the JWT Guard Router, and NEAR's MPC network are shared infrastructure deployed on mainnet (fast-auth.near, jwt.fast-auth.near, v1.signer) — you integrate with them, you don't redeploy them. You can self-host the auth side: deploy your own guard contract that implements the JwtGuard trait, or run an off-chain issuer whose JWTs are verified by CustomIssuerGuard. Both extension points are documented.",
  },
  {
    q: "Has NEARauth been audited?",
    a: "Yes. The NEARauth smart contracts and signing infrastructure have been audited by Halborn, an independent security firm specializing in Web3. The full security report is publicly available.",
  },
];
