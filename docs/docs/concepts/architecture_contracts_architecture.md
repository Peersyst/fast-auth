# Architecture

The FastAuth contract system is organized into several categories based on their responsibilities:

- **Entry Point** - The `FastAuth` contract serves as the main gateway for users to interact with the system.
- **Router** - The `JwtGuardRouter` contract routes verification requests to the appropriate guard based on the authentication provider.
- **Guards** - Middleware contracts that verify JWT tokens from specific identity providers (Auth0, Firebase, Custom Issuers).
- **Attestation** - The `Attestation` contract manages decentralized public key updates through a quorum-based system.

## Contract Interaction Flow

1. **User Request**: The user calls the `sign` function on the `FastAuth` contract with their JWT token and the payload to sign.
2. **Guard Resolution**: `FastAuth` resolves the guard contract based on the `guard_id` prefix. If the prefix is `jwt`, the request is routed to `JwtGuardRouter`.
3. **JWT Verification**: The appropriate guard contract verifies the JWT signature and claims.
4. **MPC Signing**: Upon successful verification, `FastAuth` forwards the signing request to the MPC network.
5. **Signature Return**: The MPC signature is returned to the user.

### Contract Architecture Diagram

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. sign(JWT + payload)
     │
     ▼
┌─────────────────────────────────┐
│        FastAuth                 │
│      (Entry Point)              │
└────┬────────────────────────────┘
     │ 2. guard_id prefix = 'jwt'
     │
     ▼
┌─────────────────────────────────┐
│      JwtGuardRouter             │
│         (Router)                │
└───┬──────┬──────┬───────────────┘
    │      │      │
    │ 3a   │ 3b   │ 3c
    │      │      │
    ▼      ▼      ▼
┌──────┐ ┌──────────┐ ┌──────────────────┐
│Auth0 │ │Firebase  │ │ CustomIssuer     │
│Guard │ │Guard     │ │ Guard            │
└───┬──┘ └────┬─────┘ └────────┬─────────┘
    │         │                │
    │         │ Verify        │ Verify
    │         │ public keys   │ public keys
    │         │                │
    │         ▼                ▼
    │    ┌──────────────────────────┐
    │    │     Attestation          │
    │    │   (Key Management)      │
    │    └──────────────────────────┘
    │
    │ 4. Verification success
    │
    ▼
┌─────────────────────────────────┐
│        FastAuth                 │
│      (Entry Point)              │
└────┬────────────────────────────┘
     │ 5. Forward signing request
     │
     ▼
┌─────────────────────────────────┐
│      MPC Network               │
│    (Signing Service)           │
└────┬────────────────────────────┘
     │ 6. Return signature
     │
     ▼
┌─────────────────────────────────┐
│        FastAuth                 │
│      (Entry Point)              │
└────┬────────────────────────────┘
     │ 7. Return signature
     │
     ▼
┌─────────┐
│  User   │
└─────────┘
```

**Flow Description:**

1. **User** calls `sign()` on **FastAuth** with JWT token and payload
2. **FastAuth** routes to **JwtGuardRouter** when `guard_id` prefix is `jwt`
3. **JwtGuardRouter** delegates to the appropriate guard:
   - **Auth0Guard** (3a)
   - **FirebaseGuard** (3b) - verifies keys via **Attestation**
   - **CustomIssuerGuard** (3c) - verifies keys via **Attestation**
4. Guards return verification success to **FastAuth**
5. **FastAuth** forwards signing request to **MPC Network**
6. **MPC Network** returns signature to **FastAuth**
7. **FastAuth** returns signature to **User**

## Contract Categories

### Entry Point

- [FastAuth](./architecture_contracts_fa.md) - The main contract that manages guards, verifies payloads via delegation, and coordinates MPC signing. Supports multiple signature algorithms: `secp256k1`, `ecdsa`, and `eddsa`.

### Router

- [JwtGuardRouter](./architecture_contracts_jwt-guard-router.md) - A registry and router for JWT guard contracts. Delegates verification to the appropriate guard based on the guard name.

### Guards

All guard contracts implement the `JwtGuard` trait, which provides:
- RS256 JWT signature verification
- Issuer and expiration validation
- Custom claims verification (specific to each guard type)

| Guard | Provider | Key Management | Custom Claims |
|-------|----------|----------------|---------------|
| [Auth0Guard](./architecture_contracts_auth0-guard.md) | Auth0 | Owner-managed | `fatxn` claim matching |
| [FirebaseGuard](./architecture_contracts_firebase-guard.md) | Firebase | Attestation-based | OIDC hash claim matching |
| [CustomIssuerGuard](./architecture_contracts_custom-issuer-guard.md) | Custom OIDC | DAO-managed | OIDC hash claim matching |

### Supporting Infrastructure

- [Attestation](./architecture_contracts_attestation.md) - Decentralized public key management through attester quorum consensus.

## Security Model

The architecture implements multiple layers of security:

1. **JWT Verification**: Guards verify the cryptographic signature of JWT tokens using RS256.
2. **Claim Validation**: Each guard validates specific claims (issuer, expiration, custom claims).
3. **Quorum-Based Key Updates**: The attestation contract ensures public keys can only be updated when multiple trusted attesters agree.
4. **Role-Based Access Control**: Administrative functions are protected by role-based permissions (DAO, CodeStager, CodeDeployer, etc.).
5. **Pause Functionality**: Critical contracts support pausing to mitigate security incidents.
