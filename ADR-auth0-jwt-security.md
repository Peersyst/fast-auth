# ADR: Auth0 JWT Security Architecture

**Status:** Proposed — pending implementation
**Date:** 2026-05-27
**Scope:** `packages/auth0/src/actions`, `contracts/jwt-guards/auth0-guard`, `packages/sdks/browser`, `packages/providers/javascript`, `packages/providers/react-native`, Auth0 tenant configuration.

---

## 1. Context

### 1.1 Current state

Today the Auth0 flow emits **one access token** that serves two unrelated purposes:

1. **Session against the dApp backend** (`https://api.auth.near.org`).
2. **On-chain transaction signing** (the same token is published in-chain as `verify_payload` for the `auth0-guard` contract).

Concrete properties of the JWT currently issued (verified by decoding a real production-shaped token):

- `iss`: `https://login.auth.near.org/`
- `aud`: `["https://api.auth.near.org", "https://near-auth.us.auth0.com/userinfo"]`
- `scope`: `openid profile email`
- `exp - iat`: 86,400 seconds (24 hours)
- `sub`: raw Google subject identifier (`google-oauth2|<numeric_id>`)
- `fatxn`: transaction bytes injected by `packages/auth0/src/actions/authorize-app.action.js`

### 1.2 Identified risks

1. **Cross-API replay.** A JWT recovered from the chain explorer can be used against `/userinfo` and `https://api.auth.near.org` for up to 24 hours.
2. **PII leak via `/userinfo`.** Scope `profile email` permits retrieving the user's email, name, and picture from the JWT.
3. **PII leak via `sub`.** The Google subject identifier is permanently visible on-chain, correlatable across services.
4. **Modal phishing.** The Auth0 Action renders a confirmation modal whose `imageUrl` and `name` come from query params controlled by the dApp; no Auth0-vetted binding to the actual application identity.
5. **24h replay window** for any of the above. Disproportionate for tokens that authorise a single on-chain transaction.

### 1.3 Vectors already mitigated (no change required)

- **Cross-transaction replay.** `claims.fatxn != sign_payload` rejects a JWT used for a different transaction (`auth0-guard/src/lib.rs:202-205`).
- **Same-transaction double-submission.** NEAR transaction nonce uniqueness rejects the second inclusion attempt.
- **Cross-chain replay.** `sign_payload` includes `receiver_id` and `block_hash`, which differ across networks.

### 1.4 Out of scope

- **`custom-issuer-guard`.** The custom issuer (both `custom-issuer-go` and `custom-issuer`) emits purpose-specific JWTs that contain only `fatxn` plus minimal claims (verified in `apps/custom-issuer-go/modules/issuer/service/service.go:49-100` and `apps/custom-issuer/src/modules/issuer/issuer.service.ts:84`). No "general access token" with the same signing key exists. The dual-purpose problem is exclusive to the Auth0 path.
- **JWT routing.** The `jwt-guard-router` continues to route by `guard_id = "jwt#<issuer>"`. The audience binding introduced below is independent of routing.
- **NEAR transaction-level security.** Untouched.

---

## 2. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Audience separation | Dedicated Auth0 API for on-chain tokens, distinct from session API. |
| D2 | Audience identifier | Bare contract account ID (e.g., `auth0.jwt.fast-auth.near`). No URN wrapping. |
| D3 | Audience enforcement | `claims.aud == env::current_account_id()` inside `auth0-guard`. No stored state. |
| D4 | TTL | 60s for the signing audience. Session audience unchanged. |
| D5 | Action discriminator | AND-logic on `event.resource_server.identifier` + query params; explicit `api.access.deny` on inconsistent states. The Action also strips `profile`/`email`/`offline_access` from the issued token via `api.accessToken.removeScope()` to compensate for `@auth0/auth0-spa-js` unioning per-call scope with its built-in `"openid profile email"` default. `scope` is a reserved claim and cannot be overridden via `setCustomClaim`. `openid` cannot be removed because Auth0 then declines to emit the `id_token` and `@auth0/auth0-spa-js` hard-fails the callback. Net signing-token scope: `"openid transaction:sign"`. `/userinfo` returns only `sub` (no email/name/picture); full PII closure on `/userinfo` depends on D13. |
| D6 | SDK client topology | One `Auth0Client` per provider, audience override per call. |
| D7 | SDK option shape | `network`-keyed defaults for audiences and domain; `signingAudience` and `audience` exposed as optional overrides. |
| D8 | Auth0 client model | One Auth0 Application per dApp. |
| D9 | Modal branding | Read `name` and `logo_uri` from `event.client.*`. Remove `imageUrl`/`name` from SDK API. |
| D10 | `guardId` in SDK response | Unchanged (`jwt#https://${domain}/`). It is the router key, not the audience. |
| D11 | Anti-replay (`jti`) | **Not implemented.** NEAR nonce is sufficient. Reopen if non-NEAR-nonce flows are added. |
| D12 | Rollout | Hard cut. No backwards-compatibility window (system is pre-launch). |
| D13 | PII reduction (`sub` hashing) | **Critical path** (promoted from "pending work" after empirical validation). Override `sub` to `sha256(SUB_SALT \|\| event.user.user_id)` on **both** session and signing tokens, with namespaced-claim fallback. Required because `openid` cannot be removed from the signing scope (Auth0 then skips id_token issuance and the SPA SDK callback hard-fails), which leaves `/userinfo` callable on the signing token and returns the raw Google `sub`. Hashing the `sub` is the only remaining lever to close that vector and the on-chain payload leak. |

### 2.1 D1, D2, D3 — Audience as primary defense

A new Auth0 API is registered per deployment. Its identifier is the actual NEAR account ID of the corresponding `auth0-guard` contract instance:

| Environment | Audience |
|---|---|
| mainnet | `auth0.jwt.fast-auth.near` |
| testnet | `auth0.jwt.fast-auth.testnet` |

The guard contract validates the audience by direct comparison with `env::current_account_id()`. No `expected_audience` field in state; no setter; no migration. The check is self-evident and cannot be misconfigured.

**Why bare account ID and not a URN:**
- Already a unique, trustless identifier from NEAR's account system.
- Self-routable: explorers and indexers recognise it as an account.
- No out-of-band convention (e.g., `urn:near:<id>`) for the contract to maintain in sync with Auth0 config.
- The `iss` claim already disambiguates the chain ecosystem; URN namespacing in `aud` would be redundant.
- Cross-environment isolation is automatic (each guard deployment has a distinct account ID).

**Alternatives considered and rejected:**
- **Stored `expected_audience` with owner setter.** Initially proposed; eliminated when the contract account ID itself is used as the expected value (no state needed).
- **URN format (`urn:near:<account_id>`).** Adds verbosity and an implicit out-of-band convention that must be kept in sync between Auth0 and the contract. The benefit (multi-chain namespace) is hypothetical until non-NEAR guards exist.
- **Validation off-chain (relayer-side).** Not trustless. Anyone can call the guard directly bypassing the relayer.

### 2.2 D4 — TTL = 60s

The realistic budget between token issuance and on-chain inclusion is well below 20 seconds in the auto-execute production flow (no user-controlled "review and sign" step; that exists only for debug purposes in the example SPA). 60s is selected as the lower bound supported by Auth0 for browser flows, giving a 3× safety margin for network/RPC variability.

Sub-60s values are technically possible via the Auth0 Management API but fall outside the documented supported range and are not justified given the marginal reduction in replay window relative to the 24h → 60s improvement.

Session audience TTL remains unchanged (24h). It does not carry `fatxn` and does not appear on-chain.

**Auth0 API settings for the new audience:**

| Setting | Value |
|---|---|
| Token Expiration | 60 |
| Token Expiration For Browser Flows | 60 |
| Allow Offline Access | OFF |
| Allow Skipping User Consent | ON |
| Scopes | `transaction:sign` |
| Signing Algorithm | RS256 |

### 2.3 D5 — Action discriminator

The Auth0 Action validates **two independent signals** and rejects when they disagree:

1. `event.resource_server.identifier === event.secrets.ONCHAIN_AUDIENCE` — the token being issued targets the signing audience.
2. The query string contains a `transaction` or `delegateAction` payload (plus the existing required keys).

Truth table:

| Signing audience | Tx payload | Action |
|---|---|---|
| Yes | Yes | Render modal, inject `fatxn`. |
| No | No | No-op (normal session login). |
| Yes | No | `api.access.deny("Signing audience requested without transaction payload")`. |
| No | Yes | `api.access.deny("Transaction payload only allowed with signing audience")`. |

The `ONCHAIN_AUDIENCE` value lives in `event.secrets`, not hardcoded, so the same Action code works across deployments (testnet, mainnet, staging) by configuring tenant secrets accordingly.

### 2.4 D6, D7 — SDK architecture

Each provider (`packages/sdks/browser/src/providers/auth0`, `packages/providers/javascript`, `packages/providers/react-native`) keeps a single `Auth0Client` (or `Auth0` for RN). The signing audience is passed per call to `loginWithRedirect`, `loginWithPopup`, and `getTokenSilently`. The library's internal cache is keyed by `(audience, scope)`, so token isolation works without a second client.

**Rejected alternative: two-client setup (`sessionClient` + `signingClient`).** `handleRedirectCallback` validates against the client that initiated the redirect; with two clients the SDK must dispatch correctly. With one client this concern disappears.

The SDK ships curated defaults so a dApp developer never has to know the audience strings:

```ts
export type FastAuthNetwork = "mainnet" | "testnet";

export type Auth0ProviderOptions = {
    network: FastAuthNetwork;       // required
    clientId: string;                // required, per-dApp
    redirectUri: string;             // required, per-dApp
    domain?: string;                 // override (debug/forks)
    audience?: string;               // override
    signingAudience?: string;        // override
};
```

```ts
// packages/sdks/browser/src/providers/auth0/auth0.defaults.ts (and equivalent in others)
export const FAST_AUTH_AUTH0_DEFAULTS: Record<FastAuthNetwork, {
    domain: string;
    audience: string;
    signingAudience: string;
}> = {
    mainnet: {
        domain: "login.auth.near.org",
        audience: "https://api.auth.near.org",
        signingAudience: "auth0.jwt.fast-auth.near",
    },
    testnet: {
        domain: "login.testnet.auth.near.org",
        audience: "https://api.testnet.auth.near.org",
        signingAudience: "auth0.jwt.fast-auth.testnet",
    },
} as const;
```

### 2.5 D8, D9 — Per-dApp clients

Each integrating dApp registers its own Auth0 Application. Implications:

- `clientId` is required in `Auth0ProviderOptions`. No default; explicit per dApp.
- The Action can read `event.client.name` and `event.client.metadata?.logo_uri` from Auth0's centrally vetted client registry. The previous query-param-based `imageUrl`/`name` are removed from the SDK API to eliminate the phishing vector.
- The `azp` claim now identifies which dApp originated the token, enabling future per-dApp policy (rate limits, scope restrictions, transaction policy) without further architectural changes.
- Compromise blast radius is contained: a breached dApp's client can be revoked without affecting others.

**Onboarding workflow (interim, manual):**

1. dApp developer requests integration with: dApp name, logo, callback URL(s).
2. NEAR Foundation registers an Application in the Auth0 tenant with:
   - Type: SPA (web) or Native (mobile).
   - Allowed Callback URLs / Logout URLs / Web Origins: the dApp's.
   - Grants on both APIs (session audience + signing audience).
   - Same Connections (Google, Apple, …) as tenant default.
3. NEAR Foundation returns the `clientId` to the developer.

Self-service portal automation via Auth0 Management API is a future improvement; not blocking.

**Auth0 limits.** Application count is not the billing axis (MAU is). For practical deployments the application limit is non-binding on paid plans. Audiences (APIs) are shared infrastructure — only two APIs total (session + signing), regardless of dApp count.

### 2.6 D10 — `guardId` unchanged

`SignatureRequest.guardId` continues to be `jwt#https://${domain}/`. The `fa` contract calls `jwt-guard-router.verify(guard_id, …)`, which parses the prefix and looks up the actual guard `AccountId` in its `LookupMap` (`contracts/jwt-guard-router/src/lib.rs:185-219`). This routing key is independent of the new audience binding inside the guard.

### 2.7 D11 — No `jti` for now

The vectors that `jti` would close are already closed by NEAR's transaction nonce uniqueness and by `claims.fatxn == sign_payload`. The remaining theoretical window — replaying the JWT against the guard's `verify` within 60s — has no on-chain side effects that are non-idempotent. Adding `jti` storage to the guard would introduce mutable state, gas cost per verify, and an eviction problem, all to mitigate a vector with no observable damage.

Reopen this decision if any of the following happens:
- The guard `verify` gains non-idempotent side effects (logs as events, counters, payments, …).
- A flow is added that signs an authorization not bound to a NEAR transaction (cross-chain bridges, off-chain action authorization).
- An external audit requires it explicitly.

### 2.8 D12 — Rollout

Hard cut. The system is not in production. No tolerance window, no dual-aud acceptance in the guard, no forced re-login. Standard deploy order:

1. Auth0 tenant configuration.
2. Auth0 Action update.
3. Contract redeploy with audience validation.
4. SDK release with breaking-change major version bump.
5. Example SPA update.

### 2.9 D13 — Hashed `sub` (pending work)

**Goal.** Remove the Google subject identifier from the on-chain footprint while preserving the cross-dApp identity model (one user = one NEAR account across all dApps).

**Design.**
- In the Action, compute `nearSub = sha256(event.secrets.SUB_SALT || event.user.user_id)` and override `sub` via `api.accessToken.setCustomClaim("sub", nearSub)` on **both** the session and the signing tokens (consistency for `getPath()` and on-chain identity).
- The contract code remains untouched: `claims.sub` continues to return the user identity, but its value is now the deterministic hash.
- The SDK's `getPath()` continues to read `sub` from the session token; the value is now the same hash that the contract sees from the signing token.

**Prerequisite verification.** It is not fully confirmed that Auth0 honours `setCustomClaim("sub", …)` for access tokens — `sub` is an OIDC reserved claim. Before locking the design:

1. Add a temporary `api.accessToken.setCustomClaim("sub", "test-override")` to the Action.
2. Decode the resulting JWT.
3. If `sub == "test-override"` → override is honoured; proceed with the design above.
4. If `sub == "google-oauth2|…"` → override is filtered; fallback to a namespaced custom claim (`https://near-auth.org/sub`), with corresponding changes to `base-jwt-guard/src/core.rs` and to `getPath()` in all three providers.

**Operational requirements.**
- `SUB_SALT`: ≥ 32 bytes of random, stored exclusively in Auth0 tenant secrets, never in the SDK or contracts.
- Backup: under strict access control. Rotation is destructive (all users obtain new on-chain identities); avoid unless responding to a known compromise.

---

## 3. Consequences

### 3.1 Security improvements (Phase 1, excluding D13)

- JWT published on-chain cannot authorise calls to backend APIs: `aud = auth0.jwt.fast-auth.near` is rejected by anything that validates `aud`.
- `/userinfo` returns only `sub` for the signing token: `profile`/`email` are stripped server-side via `removeScope`. `openid` must remain to satisfy `@auth0/auth0-spa-js`'s id_token requirement. PII closure on `sub` is delivered by D13.
- Replay window: from 24h to 60s (1,440× reduction).
- Modal phishing eliminated: branding is read from Auth0's central client registry, not from dApp-controlled query params.
- Compromise isolation: per-dApp `azp` allows revoking or filtering one dApp without affecting others.

### 3.2 Trade-offs accepted

- **Manual dApp onboarding.** Each new integration requires NEAR Foundation to register an Auth0 Application. Mitigation: automate via Management API at scale.
- **Breaking SDK API.** `audience` is no longer required (now an override); `clientId` becomes required; `imageUrl`/`name` are removed from signature-request options. Justified by the pre-launch state.
- **Residual `sub` leak until D13.** Empirically validated: `openid` is non-removable from the signing scope without breaking the SPA SDK callback flow. While in this state, `/userinfo` returns `{"sub": "<google_id>"}` for the 60s of token validity, and the on-chain JWT payload also contains the raw `sub`. D13 is the closure for both vectors and must land before any production launch.
- **Salt management overhead.** When D13 lands, `SUB_SALT` becomes a critical secret of the deployment.

### 3.3 Items not addressed by this ADR

- **dApp-level transaction policy.** With `azp` per-dApp, the door is open to per-dApp restrictions (e.g., "this dApp can only call contracts in an allowlist"), but no such policy is introduced here.
- **Multi-IdP recovery.** If a user changes their federated identity (e.g., switches from Google to Apple), they lose access to their on-chain account because `event.user.user_id` changes. This is the current behaviour and is not modified.
- **Self-service dApp registration portal.** Out of scope; manual onboarding for now.

---

## 4. Implementation Plan

### Phase 1 — Auth0 tenant configuration

Per environment (mainnet and testnet tenants, or a single tenant with separate APIs):

1. Create API:
   - **Identifier**: `auth0.jwt.fast-auth.near` (or the equivalent testnet account).
   - **Signing Algorithm**: RS256.
   - **Token Expiration**: 60.
   - **Token Expiration For Browser Flows**: 60.
   - **Allow Offline Access**: OFF.
   - **Allow Skipping User Consent**: ON.
2. Define permission `transaction:sign` on the new API.
3. Grant access to the new API from each existing first-party Application (signing-audience access).
4. Mark first-party Applications as "First Party Application" and enable "Allow Skipping User Consent".
5. Add tenant secrets to the existing Action:
   - `ONCHAIN_AUDIENCE` = `auth0.jwt.fast-auth.near`.
   - `SUB_SALT` (32+ bytes random; used in Phase 6).

**Acceptance criteria.** Issuing a token with `audience=<new>` returns a JWT with `aud=<new>`, `exp - iat = 60`, `scope == "openid transaction:sign"` (exact). `/userinfo` called with the token must return `200 OK` and a body containing **only** `{"sub": "..."}` (no `email`, no `name`, no `picture`, no `locale`, no `email_verified`). Closure of the residual `sub` leak is delivered by D13 in Phase 6.

### Phase 2 — Contract changes (`auth0-guard`)

File: `contracts/jwt-guards/auth0-guard/src/lib.rs`.

1. Extend `CustomClaims`:
   ```rust
   #[derive(Serialize, Deserialize)]
   pub struct CustomClaims {
       pub fatxn: Vec<u8>,
       pub aud: serde_json::Value,  // string or array per OIDC spec
   }
   ```
2. Add audience-matching helper:
   ```rust
   fn audience_matches(aud: &serde_json::Value, expected: &str) -> bool {
       match aud {
           serde_json::Value::String(s) => s == expected,
           serde_json::Value::Array(arr) => arr.iter().any(|v|
               v.as_str().map(|s| s == expected).unwrap_or(false)
           ),
           _ => false,
       }
   }
   ```
3. In `verify_custom_claims`:
   ```rust
   let expected = env::current_account_id().to_string();
   if !audience_matches(&claims.aud, &expected) {
       return (false, "audience mismatch".to_string());
   }
   if claims.fatxn != sign_payload {
       return (false, "Transaction payload mismatch".to_string());
   }
   (true, "".to_string())
   ```
4. Update unit tests in `contracts/jwt-guards/auth0-guard/src/lib.rs#tests` with a fresh JWT containing the correct `aud`. Regenerate fixtures.
5. Update integration tests in `contracts/jwt-guards/auth0-guard/tests/test_integration.rs`.

**Acceptance criteria.** All tests pass. A JWT with `aud` other than the deployed contract's account ID is rejected with `"audience mismatch"`. A JWT with the correct `aud` and matching `fatxn` is accepted.

### Phase 3 — Auth0 Action

File: `packages/auth0/src/actions/authorize-app.action.js`.

Rewrite `onExecutePostLogin`:

```js
exports.onExecutePostLogin = async (event, api) => {
    const ONCHAIN_AUD = event.secrets.ONCHAIN_AUDIENCE;
    const query = event.request.query;
    const isOnchainAudience = event.resource_server?.identifier === ONCHAIN_AUD;
    const hasTxParams = TRANSACTION_KEY in query;
    const hasDelegateParams = DELEGATE_ACTION_KEY in query;
    const hasSigningPayload = hasTxParams || hasDelegateParams;

    if (isOnchainAudience && !hasSigningPayload) {
        return api.access.deny("Signing audience requested without transaction payload");
    }
    if (!isOnchainAudience && hasSigningPayload) {
        return api.access.deny("Transaction payload only allowed with signing audience");
    }
    if (!isOnchainAudience) return;

    // On-chain flow:
    const fields = {
        imageUrl: event.client.metadata?.logo_uri ?? "",
        name: event.client.name,
    };

    // Strip OIDC profile scopes from the issued access token.
    // @auth0/auth0-spa-js unions per-call scope with its built-in default ("openid profile email"),
    // so the access token would otherwise carry profile/email and grant /userinfo access to PII.
    // `scope` is a reserved claim and cannot be overridden via setCustomClaim — use removeScope.
    // `openid` cannot be removed: Auth0 then skips id_token issuance and @auth0/auth0-spa-js
    // hard-fails the callback with "ID token is required but missing".
    api.accessToken.removeScope("profile");
    api.accessToken.removeScope("email");
    api.accessToken.removeScope("offline_access");

    if (hasTxParams) {
        const transaction = parseTransaction(query.transaction);
        api.prompt.render(event.secrets.authorize_app_modal, {
            fields: {
                ...fields,
                receiverId: transaction.receiverId,
                signerId: transaction.signerId,
                actions: stringifyActions(transaction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            query.transaction.split(",").map(Number),
        );
    } else {
        const delegateAction = decodeDelegateAction(query.delegateAction);
        api.prompt.render(event.secrets.delegate_action_modal, {
            fields: {
                ...fields,
                receiverId: delegateAction.receiverId,
                senderId: delegateAction.senderId,
                maxBlockHeight: delegateAction.maxBlockHeight.toString(),
                actions: stringifyActions(delegateAction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            query.delegateAction.split(",").map(Number),
        );
    }
};
```

**Acceptance criteria.** A signing flow with the new audience inserts `fatxn` and renders the modal using `event.client.*` data. A normal login does not inject `fatxn`. Inconsistent state combinations result in `access.deny`.

### Phase 4 — SDK changes (all three providers)

For each of:
- `packages/sdks/browser/src/providers/auth0/`
- `packages/providers/javascript/src/`
- `packages/providers/react-native/src/`

#### 4.1 Types

```ts
export type FastAuthNetwork = "mainnet" | "testnet";

export type Auth0ProviderOptions = {
    network: FastAuthNetwork;
    clientId: string;
    redirectUri: string;
    domain?: string;
    audience?: string;
    signingAudience?: string;
};
```

Remove `imageUrl` and `name` from `Auth0BaseRequestSignatureOptions` / equivalents.

#### 4.2 Defaults constant

Create `auth0.defaults.ts` (or equivalent) per package. Populate with the values from §2.4.

#### 4.3 Constructor

Merge defaults with explicit options (explicit wins):

```ts
constructor(options: Auth0ProviderOptions) {
    const defaults = FAST_AUTH_AUTH0_DEFAULTS[options.network];
    this.options = { ...defaults, ...options };
    this.client = new Auth0Client({
        domain: this.options.domain!,
        clientId: this.options.clientId,
        authorizationParams: {
            audience: this.options.audience,
            redirect_uri: this.options.redirectUri,
        },
    });
}
```

#### 4.4 `requestTransactionSignature` and `requestDelegateActionSignature`

Add explicit `audience` and `scope` overrides on the per-call `authorizationParams`:

```ts
async requestTransactionSignature(opts: Auth0RequestTransactionSignatureOptions): Promise<void> {
    await this.client.loginWithRedirect({
        authorizationParams: {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            redirect_uri: opts.redirectUri ?? this.options.redirectUri,
            transaction: encodeTransaction(opts.transaction),
        },
    });
}
```

#### 4.5 `getSignatureRequest`

Read the signing-audience token explicitly:

```ts
async getSignatureRequest(): Promise<SignatureRequest> {
    const token = await this.client.getTokenSilently({
        authorizationParams: { audience: this.options.signingAudience },
    });
    const decoded = jwt_decode<{ fatxn: Uint8Array }>(token);
    return {
        guardId: `jwt#https://${this.options.domain}/`,   // unchanged routing key
        verifyPayload: token,
        signPayload: decoded.fatxn,
    };
}
```

#### 4.6 React Native — separated credential storage

`react-native-auth0`'s `credentialsManager` is single-slot. Wrap it to key by audience:

- Persistent slot: session credentials (long TTL, used by `isLoggedIn`, `getPath`).
- Ephemeral slot (in-memory or short-lived): signing credentials, read once by `getSignatureRequest`, discarded.

Replace direct `credentialsManager.saveCredentials(credentials)` in `requestTransactionSignature` with a wrapper that routes by the audience of the returned credentials.

**Acceptance criteria.** After a signing flow on RN, `isLoggedIn()` still returns true based on session credentials (not on the short-lived signing credentials).

### Phase 5 — Example SPA

File: `examples/spa/src/`.

1. Remove `VITE_AUTH0_AUDIENCE` from `.env.example` and `config.ts`. Replace with `VITE_FAST_AUTH_NETWORK` (`mainnet`|`testnet`).
2. Update `FastAuthProvider` construction to use the new options shape.
3. In `hooks/use-transaction-signer.ts`, document that the "review and sign" intermediate step exists for debugging payload inspection and is not the recommended production pattern. Alternatively, gate it behind a `?debug=1` query param so the default UX is auto-execute after redirect callback.
4. Remove `imageUrl` / `name` from the signing call site.

### Phase 6 — Critical path: hashed `sub` (D13)

**Status note.** Promoted from "pending work" to "critical path" after empirical validation in Phase 8 confirmed that `openid` cannot be removed from the signing scope. While D13 is unimplemented, `/userinfo` returns `{"sub": "<google_id>"}` for the 60s of token validity, and the on-chain JWT payload also contains the raw Google `sub`. This must be closed before any production launch.

Sequence:

1. **Verify Auth0 behaviour** (5 min). Add `api.accessToken.setCustomClaim("sub", "TEST_OVERRIDE")` unconditionally in a sandbox Action. Log in, decode token, observe whether `sub == "TEST_OVERRIDE"` or the original Google ID.
2. **If override is honoured:**
   - Implement in Action (both session and signing tokens):
     ```js
     const crypto = require("crypto");
     const nearSub = crypto.createHash("sha256")
         .update(`${event.secrets.SUB_SALT}|${event.user.user_id}`)
         .digest("hex");
     api.accessToken.setCustomClaim("sub", nearSub);
     ```
   - No changes required to `base-jwt-guard` or `auth0-guard` (`claims.sub` semantics preserved).
   - No changes required to SDK `getPath()`.
3. **If override is filtered:**
   - Use a namespaced custom claim, e.g., `https://near-auth.org/sub`.
   - Modify `contracts/jwt-guards/base-jwt-guard/src/core.rs` `Claims` to deserialize this claim as `near_sub` and return it instead of `sub` from `verify_claims`.
   - Modify `getPath()` across the three providers to read `near_sub`.
   - Document that the original Google `sub` remains in the JWT payload (and therefore on-chain) under this fallback path. This is a degraded outcome of D13; if unacceptable, an alternative custom-identity mechanism would need design.
4. **Document `SUB_SALT` policy:** length (≥ 32 bytes random), storage (Auth0 tenant secrets only), backup (encrypted, restricted access), rotation (destructive — avoid).

### Phase 7 — Deploy

Order (hard cut, system is pre-launch so this is safe). **Phase 6 (D13) must be complete before any production launch** — testnet rollout below can proceed without it for early validation, but mainnet release is gated on D13.

1. Auth0 tenant: APIs, Applications, secrets (including `SUB_SALT`), Action updated (including D13 hashing logic).
2. Contract: build, run tests, deploy `auth0-guard` to testnet, verify with integration test, deploy to mainnet.
3. SDK packages: major version bump (`2.0.0` from `1.0.x`), publish. If D13 falls back to the namespaced-claim path, the SDK's `getPath()` change is part of this release.
4. Example SPA: update configuration and dependencies; redeploy.
5. Documentation: update `docs/` and provider READMEs to reflect new options and onboarding flow.

### Phase 8 — Verification

- **Unit tests:** `auth0-guard` rejects wrong `aud`; accepts correct.
- **Integration tests:** end-to-end signing flow against a freshly deployed testnet guard.
- **Audit a real signing token:** confirm `aud`, `exp - iat`, `scope`, absence of `openid`/`profile`/`email`.
- **Partial-positive test:** call `/userinfo` with the signing token; expect 200 with **only the `sub` field** (no email/name/picture/locale). Confirms that `profile`/`email` were correctly stripped. The remaining `sub` leak is closed by D13.
- **Negative test:** attempt to call the guard `verify` with a JWT whose `aud` is the session audience; expect rejection.

---

## 5. Open questions / future work

- **D13 implementation (CRITICAL PATH, NOT optional).** Pending verification of whether Auth0 honours `setCustomClaim("sub", …)` for access tokens, then implementation. Empirical Phase 8 results confirm this is the only path to close the residual `sub` leak on `/userinfo` and on-chain.
- **Self-service onboarding portal.** A small admin app that uses the Auth0 Management API to provision per-dApp clients on demand. Not blocking initial launch.
- **`azp`-based policy on-chain.** With per-dApp clients, the guard or `fa` contract could enforce per-`azp` policies (allowlists, rate limits). Not part of this ADR; recorded as a future enhancement.
- **Multi-IdP account recovery.** Currently a user is bound to one IdP identity (`event.user.user_id`). Recovery flows that allow re-binding to a different IdP would require a custom identity registry. Out of scope here.
- **Anti-replay (`jti`).** Reopened if non-NEAR-nonce flows are added to the guard's usage surface.

---

## Appendix A — File-by-file change inventory

| Path | Change |
|---|---|
| `packages/auth0/src/actions/authorize-app.action.js` | Rewrite `onExecutePostLogin` per §2.3 and Phase 3. |
| `contracts/jwt-guards/auth0-guard/src/lib.rs` | Extend `CustomClaims`, add `audience_matches`, add `aud` check in `verify_custom_claims`. |
| `contracts/jwt-guards/auth0-guard/tests/test_integration.rs` | Regenerate fixtures with new `aud`. |
| `packages/sdks/browser/src/providers/auth0/auth0.types.ts` | New `Auth0ProviderOptions` shape; remove `imageUrl`/`name`. |
| `packages/sdks/browser/src/providers/auth0/auth0.provider.ts` | Constructor merge, per-call audience override, signing-audience in `getSignatureRequest`. |
| `packages/sdks/browser/src/providers/auth0/auth0.defaults.ts` | New file with `FAST_AUTH_AUTH0_DEFAULTS`. |
| `packages/providers/javascript/src/types.ts` | Same shape change. |
| `packages/providers/javascript/src/provider.ts` | Same logic change; preserve popup path symmetry. |
| `packages/providers/javascript/src/defaults.ts` | New file. |
| `packages/providers/react-native/src/types.ts` | Same shape change. |
| `packages/providers/react-native/src/provider.ts` | Same logic change + wrap `credentialsManager` for audience-keyed storage. |
| `packages/providers/react-native/src/defaults.ts` | New file. |
| `examples/spa/.env.example` | Replace `VITE_AUTH0_AUDIENCE` with `VITE_FAST_AUTH_NETWORK`. |
| `examples/spa/src/config.ts` | Use network-based config. |
| `examples/spa/src/hooks/use-transaction-signer.ts` | Optional: gate review step behind `?debug=1`. |
| `docs/` | Provider READMEs, onboarding section, breaking-change migration notes. |

## Appendix B — Auth0 Action secrets

| Key | Value | Notes |
|---|---|---|
| `ONCHAIN_AUDIENCE` | `auth0.jwt.fast-auth.near` (or testnet equivalent) | Read by Action discriminator. |
| `SUB_SALT` | 32+ bytes hex random | For Phase 6. Must not be committed anywhere outside the Auth0 tenant. |
| `authorize_app_modal` | (existing) | Custom prompt template for tx flow. |
| `delegate_action_modal` | (existing) | Custom prompt template for delegate-action flow. |
