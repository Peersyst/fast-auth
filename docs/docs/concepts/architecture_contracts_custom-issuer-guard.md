# CustomIssuerGuard

The `CustomIssuerGuard` contract (also known as `jwt-guard` in the codebase) verifies JWT tokens from custom OIDC providers. It uses a claim-based authentication model similar to `FirebaseGuard`, where users must register their OIDC token hash before authentication. This guard is ideal for organizations that want to use their own identity provider with FastAuth.

:::warning
**Required Service**: Using the `CustomIssuerGuard` requires running the [Custom Issuer Service](./architecture_custom_issuer_service.md). This backend service validates JWTs from your identity provider and re-issues them with a custom signing key that the guard can verify.
:::

## Features

- Role-based access control using the `near-plugins` framework (DAO, CodeStager, CodeDeployer, DurationManager).
- DAO-managed public key updates.
- OIDC token hash claiming mechanism with duplicate prevention.
- Bidirectional lookup between accounts and OIDC hashes.
- Storage management (deposit, withdraw, unregister) following NEP-145.
- Upgradable contract with staged deployments.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `public_keys` | `Vec<JwtPublicKey>` | List of RSA public keys for signature verification |
| `jwt_claims` | `LookupMap<AccountId, Vec<u8>>` | Mapping of user accounts to their claimed OIDC token hashes |
| `jwt_hash_claims` | `LookupMap<Vec<u8>, AccountId>` | Reverse mapping from OIDC hashes to accounts |
| `account_storage_usage` | `U128` | Storage cost per account (256 bytes) |

## Roles

| Role | Permissions |
|------|-------------|
| `DAO` | Full administrative access, can update public keys |
| `CodeStager` | Can stage contract code updates |
| `CodeDeployer` | Can deploy staged contract updates |
| `DurationManager` | Can manage upgrade duration settings |

## Initialization

```rust
#[init]
pub fn init(config: CustomIssuerGuardConfig) -> Self
```

The `CustomIssuerGuardConfig` includes:
- `public_keys`: Initial RSA public keys for the custom issuer.
- `roles`: Role configuration (super_admins, admins, grantees).

## User Registration (OIDC Claiming)

### Storage Deposit

Users must first deposit storage to register:

```rust
#[payable]
fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>) -> StorageBalance
```

### Claiming OIDC Token

After depositing storage, users claim their OIDC token hash:

```rust
pub fn claim_oidc(&mut self, oidc_token_hash: Vec<u8>)
```

- `oidc_token_hash`: A 32-byte SHA256 hash of the user's OIDC token.

**Important**: Unlike `FirebaseGuard`, this contract prevents the same OIDC hash from being claimed by multiple accounts. If a user updates their claim, the old hash is removed from the reverse lookup.

### Querying Claims

```rust
// Get the OIDC hash for an account
pub fn jwt_claim_of(&self, account_id: &AccountId) -> Option<Vec<u8>>

// Get the account that claimed a specific hash
pub fn jwt_hash_claim_of(&self, hash: &Vec<u8>) -> Option<AccountId>
```

## Public Key Management

Only accounts with the `DAO` role can update public keys:

```rust
#[access_control_any(roles(Role::DAO))]
pub fn set_public_keys(&mut self, public_keys: Vec<JwtPublicKey>)
```

All public keys are validated before being stored.

## Verification Logic

```rust
pub fn verify(&self, issuer: String, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String)
```

### Verification Steps

1. **Size Check**: JWT must not exceed 7KB.
2. **Signature Verification**: Verifies the RS256 signature against stored public keys.
3. **Claims Validation**:
   - `iss`: Must match the provided issuer.
   - `exp`: Token must not be expired.
   - `nbf`: Token must be valid (not before current time).
4. **OIDC Hash Verification**: The SHA256 hash of the JWT must match the user's claimed OIDC hash.

### Custom Claims Verification

The contract verifies that:
- The caller (`predecessor`) has a registered OIDC claim.
- The SHA256 hash of the provided JWT matches the stored claim hash.

This ensures that:
1. Only registered users can authenticate.
2. Users can only use JWTs they have previously claimed.
3. Each OIDC identity can only be linked to one NEAR account.

## Storage Management (NEP-145)

### Deposit

```rust
#[payable]
fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>) -> StorageBalance
```

### Withdraw

```rust
#[payable]
fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance
```

### Unregister

```rust
#[payable]
fn storage_unregister(&mut self, force: Option<bool>) -> bool
```

### Query Balance and Storage Usage

```rust
fn storage_balance_bounds(&self) -> StorageBalanceBounds
fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance>
pub fn get_account_storage_usage(&self) -> U128
```

## Comparison with Other Guards

| Feature | Auth0Guard | FirebaseGuard | CustomIssuerGuard |
|---------|------------|---------------|-------------------|
| Key Management | Owner-managed | Attestation-based | DAO-managed |
| User Registration | Not required | Required | Required |
| Custom Claims | `fatxn` claim | OIDC hash | OIDC hash |
| Duplicate Prevention | N/A | No | Yes |
| Reverse Lookup | N/A | No | Yes |

## Usage Flow

### Prerequisites

1. **Deploy the Custom Issuer Service**: See [Custom Issuer Service](./architecture_custom_issuer_service.md) for setup instructions.
2. **Configure the guard**: Deploy `CustomIssuerGuard` with the public key from your Custom Issuer Service.

### Setup (DAO)

1. Deploy contract with initial public keys (from Custom Issuer Service) and role configuration.
2. Configure the Custom Issuer Service with your identity provider settings.

### Registration (User)

1. Call `storage_deposit()` with sufficient NEAR.
2. Authenticate with your identity provider (e.g., Firebase, Google).
3. Send the identity provider's JWT to the Custom Issuer Service (`POST /issuer/issue`).
4. Receive the re-issued JWT from the Custom Issuer Service.
5. Compute the SHA256 hash of the re-issued JWT.
6. Call `claim_oidc(hash)` to register the OIDC identity.

### Authentication (User)

1. Authenticate with your identity provider.
2. Send the JWT to the Custom Issuer Service to get a re-issued JWT.
3. Call `FastAuth.sign()` with `guard_id: "jwt#custom-issuer"`, the re-issued JWT, and sign payload.
4. The guard verifies the JWT and checks that its hash matches the user's claim.
5. On success, signing proceeds via MPC.

### Key Rotation (DAO)

1. Generate new RSA key pair for the Custom Issuer Service.
2. Update the Custom Issuer Service with the new private key.
3. DAO members call `set_public_keys()` with the new public key components.
