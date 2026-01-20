# Auth0Guard

The `Auth0Guard` contract verifies JWT tokens issued by Auth0. It implements the `JwtGuard` trait for RS256 signature verification and validates a custom `fatxn` claim to ensure the signed transaction matches what was authorized by the user.

## Features

- Owner-only access control for administrative functions (updating public keys, changing owner).
- Verifies JWT signatures using the RS256 algorithm with multiple public keys.
- Validates the `fatxn` custom claim against the sign payload.
- Validates standard JWT claims (issuer, expiration, not-before).
- Supports contract upgrades with state migration.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `public_keys` | `Vec<JwtPublicKey>` | List of RSA public keys for signature verification |
| `owner` | `AccountId` | The contract owner with administrative privileges |

### JwtPublicKey Structure

```rust
pub struct JwtPublicKey {
    pub n: Vec<u8>,  // RSA modulus
    pub e: Vec<u8>,  // RSA exponent
}
```

## Initialization

```rust
#[init]
pub fn init(owner: AccountId, public_keys: Vec<JwtPublicKey>) -> Self
```

- `owner`: The account that will have administrative privileges.
- `public_keys`: The RSA public key components for JWT verification.

All public keys are validated on initialization.

## Public Key Management

In case of a security breach or key rotation policy, the contract owner can update the RSA public keys:

```rust
pub fn set_public_keys(&mut self, public_keys: Vec<JwtPublicKey>)
```

:::warning
Only the **owner** of the contract can update the RSA public key components.
:::

## Verification Logic

The `verify` function is called by the `FastAuth` or `JwtGuardRouter` contract:

```rust
pub fn verify(&self, issuer: String, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String)
```

- `issuer`: The expected JWT issuer (e.g., `https://dev-xxx.us.auth0.com/`).
- `jwt`: The JWT token to verify.
- `sign_payload`: The payload to verify against the `fatxn` claim.
- `predecessor`: The original caller's account ID.

Returns:
- `bool`: Whether the JWT is valid.
- `String`: The subject (`sub`) claim if valid, or an error message.

### Verification Steps

1. **Size Check**: JWT must not exceed 7KB.
2. **Signature Verification**: Verifies the RS256 signature against any of the stored public keys.
3. **Claims Validation**:
   - `iss`: Must match the provided issuer.
   - `exp`: Token must not be expired.
   - `nbf`: Token must be valid (not before current time).
4. **Custom Claims Verification**: The `fatxn` claim must match the `sign_payload`.

### Custom Claims Structure

```rust
pub struct CustomClaims {
    pub fatxn: Vec<u8>,
}
```

The `fatxn` (FastAuth Transaction) claim contains the serialized transaction payload that the user authorized. This ensures that the JWT can only be used to sign the specific transaction it was issued for.

## Ownership Management

### Querying Owner

```rust
pub fn owner(&self) -> AccountId
```

### Changing Owner

```rust
pub fn change_owner(&mut self, new_owner: AccountId)
```

Only the current owner can change ownership.

## Contract Upgrades

The owner can upgrade the contract:

```rust
pub fn update_contract(&self) -> Promise
```

## Usage Example

A typical verification flow:

1. User authenticates with Auth0 and requests a JWT with the `fatxn` claim containing their transaction data.
2. User calls `FastAuth.sign()` with `guard_id: "jwt#auth0"`, their JWT, and the sign payload.
3. `FastAuth` routes to `JwtGuardRouter`, which routes to `Auth0Guard`.
4. `Auth0Guard` verifies the JWT signature and checks that `fatxn` matches `sign_payload`.
5. On success, the user's `sub` claim is returned and used to derive the MPC signing path.
