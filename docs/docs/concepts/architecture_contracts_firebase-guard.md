# FirebaseGuard

The `FirebaseGuard` contract verifies JWT tokens issued by Firebase Authentication. Unlike the `Auth0Guard`, it uses a claim-based authentication model where users must first register and claim their OIDC token hash before they can use it for signing. Public keys are managed through the `Attestation` contract for decentralized key updates.

## Features

- Role-based access control using the `near-plugins` framework (DAO, CodeStager, CodeDeployer, DurationManager).
- Decentralized public key management through the `Attestation` contract.
- OIDC token hash claiming mechanism for user registration.
- Storage management (deposit, withdraw, unregister) following NEP-145.
- Upgradable contract with staged deployments.
- Validates JWT signature and matches against user's claimed OIDC hash.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `public_keys` | `Vec<JwtPublicKey>` | List of RSA public keys for signature verification |
| `jwt_claims` | `LookupMap<AccountId, Vec<u8>>` | Mapping of user accounts to their claimed OIDC token hashes |
| `account_storage_usage` | `U128` | Storage cost per account (128 bytes) |
| `attestation_contract` | `AccountId` | Address of the attestation contract for key management |

## Roles

| Role | Permissions |
|------|-------------|
| `DAO` | Full administrative access, can update public keys, manage attestation contract |
| `CodeStager` | Can stage contract code updates |
| `CodeDeployer` | Can deploy staged contract updates |
| `DurationManager` | Can manage upgrade duration settings |

## Initialization

```rust
#[init]
pub fn init(config: FirebaseGuardConfig, attestation_contract: AccountId) -> Self
```

The `FirebaseGuardConfig` includes:
- `public_keys`: Initial RSA public keys.
- `roles`: Role configuration (super_admins, admins, grantees).

## User Registration (OIDC Claiming)

Before a user can authenticate with Firebase, they must register their OIDC token hash.

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

The claimed hash is stored and will be used to verify future authentication requests.

### Querying Claims

```rust
pub fn jwt_claim_of(&self, account_id: &AccountId) -> Option<Vec<u8>>
```

## Public Key Management

Public keys are fetched from the `Attestation` contract:

```rust
pub fn set_public_keys(&mut self) -> Promise
```

This function:
1. Calls `get_public_keys()` on the attestation contract.
2. In the callback, validates and stores the returned public keys.

### Setting Attestation Contract

Only accounts with the `DAO` role can update the attestation contract address:

```rust
#[access_control_any(roles(Role::DAO))]
pub fn set_attestation_contract(&mut self, attestation_contract: AccountId)
```

### Querying Attestation Contract

```rust
pub fn get_attestation_contract(&self) -> AccountId
```

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

Unlike `Auth0Guard`, `FirebaseGuard` verifies that:
- The caller has a registered OIDC claim.
- The SHA256 hash of the provided JWT matches the stored claim hash.

This ensures that users can only authenticate with JWTs they have previously registered.

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

### Query Balance

```rust
fn storage_balance_bounds(&self) -> StorageBalanceBounds
fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance>
```

## Usage Flow

1. **Registration**:
   - User calls `storage_deposit()` with sufficient NEAR.
   - User obtains a Firebase JWT and computes its SHA256 hash.
   - User calls `claim_oidc(hash)` to register their OIDC identity.

2. **Authentication**:
   - User obtains a fresh Firebase JWT.
   - User calls `FastAuth.sign()` with `guard_id: "jwt#firebase"`, their JWT, and sign payload.
   - `FirebaseGuard` verifies the JWT signature and checks that its hash matches the user's claim.
   - On success, signing proceeds via MPC.

3. **Key Rotation**:
   - Attesters submit new public keys to the `Attestation` contract.
   - When quorum is reached, anyone can call `set_public_keys()` to update this guard's keys.
