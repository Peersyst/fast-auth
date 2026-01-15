# MPC

The Multi-Party Computation (MPC) network is a critical component of FastAuth that enables secure, distributed key management and signing. Instead of a single entity holding a private key, the key is split into shares distributed among multiple parties, and signatures are generated through collaborative computation.

## Overview

FastAuth leverages the NEAR MPC network to provide:

- **Key Derivation**: Unique keys are derived for each user based on their authenticated identity.
- **Distributed Signing**: Signatures are produced without any single party having access to the full private key.
- **Chain Agnosticism**: The MPC can sign for multiple blockchain networks (NEAR, Ethereum, Bitcoin, etc.).

## Key Derivation Path

When a user authenticates through FastAuth, a unique signing path is constructed:

```
{guard_id}#{user_subject}
```

For example:
- `jwt#auth0#google-oauth2|123456789` - An Auth0 user authenticating via Google.
- `jwt#firebase#user@example.com` - A Firebase user.

This path is used by the MPC to derive a unique key pair for each user, ensuring:
- Different users get different keys.
- The same user always gets the same key (deterministic derivation).
- Keys are isolated between different authentication providers.

## Signature Algorithms

The FastAuth contract supports three signature algorithms when communicating with the MPC:

### Secp256k1 (Legacy)

Uses the legacy `SignRequest` format:

```rust
pub struct SignRequest {
    pub payload: Vec<u8>,      // SHA256 hash of the data to sign
    pub path: String,          // Key derivation path
    pub key_version: u32,      // MPC key version
}
```

### ECDSA

Uses the `SignRequestV2` format with ECDSA payload:

```rust
pub struct SignRequestV2 {
    pub path: String,
    pub payload_v2: PayloadType::Ecdsa(hex_payload),
    pub domain_id: u64,
}
```

### EdDSA

Uses the `SignRequestV2` format with EdDSA payload:

```rust
pub struct SignRequestV2 {
    pub path: String,
    pub payload_v2: PayloadType::Eddsa(hex_payload),
    pub domain_id: u64,
}
```

## MPC Configuration

The FastAuth contract stores MPC configuration:

| Setting | Description | Default |
|---------|-------------|---------|
| `mpc_address` | Account ID of the MPC contract | Contract's own account |
| `mpc_key_version` | Version of the MPC key (for key rotation) | 0 |
| `mpc_domain_id` | Domain ID for SignRequestV2 | 1 |

These can be updated by the contract owner:

```rust
pub fn set_mpc_address(&mut self, mpc_address: AccountId)
pub fn set_mpc_key_version(&mut self, mpc_key_version: u32)
pub fn set_mpc_domain_id(&mut self, mpc_domain_id: u64)
```

## Signing Flow

1. **User Request**: User calls `FastAuth.sign()` with their JWT and payload.
2. **JWT Verification**: The appropriate guard verifies the JWT and returns the user's subject claim.
3. **Path Construction**: FastAuth constructs the path as `{guard_id}#{subject}`.
4. **Payload Hashing**: The sign payload is SHA256 hashed.
5. **MPC Request**: FastAuth calls the MPC contract with the sign request.
6. **Signature Generation**: The MPC network collaboratively produces a signature.
7. **Response**: The signature is returned to the user.

## Signature Response

### ECDSA Response

```rust
pub struct EcdsaSignResponse {
    pub scheme: String,
    pub big_r: AffinePoint,
    pub s: Scalar,
    pub recovery_id: u8,
}
```

### EdDSA Response

```rust
pub struct EdDsaSignResponse {
    pub scheme: String,
    pub signature: Vec<u8>,
}
```

## Deposit Requirements

MPC signing requires an attached deposit to cover:
- Gas costs for the MPC computation.
- Network fees.

If signing fails (either during verification or MPC computation), the deposit is refunded to the original caller.
