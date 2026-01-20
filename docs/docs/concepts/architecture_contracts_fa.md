# FastAuth

The `FastAuth` contract is the main entry point for authentication and MPC-based signing in the FastAuth architecture. It manages guard contracts, verifies payloads through delegation, and coordinates the signing process via the MPC network.

## Features

- Owner-only access control for administrative functions (adding/removing guards, updating MPC settings).
- Pauser role for emergency pause functionality.
- Maintains a mapping of guard IDs to their contract account IDs.
- Delegates verification requests to the appropriate guard contract.
- Coordinates the full authentication and signing flow for end-users.
- Supports multiple signature algorithms: `secp256k1`, `ecdsa`, and `eddsa`.
- Refunds attached deposits on verification or signing failures.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `guards` | `HashMap<String, AccountId>` | Mapping from guard IDs to their contract account IDs |
| `owner` | `AccountId` | The contract owner with administrative privileges |
| `mpc_address` | `AccountId` | The MPC contract address |
| `mpc_key_version` | `u32` | The current MPC key version (default: 0) |
| `mpc_domain_id` | `u64` | The MPC domain ID (default: 1) |
| `version` | `String` | The contract version string |
| `pauser` | `AccountId` | The account authorized to pause the contract |
| `paused` | `bool` | Whether the contract is currently paused |

## Signature Algorithms

The contract supports three signature algorithms:

| Algorithm | Description | MPC Request Type |
|-----------|-------------|------------------|
| `secp256k1` | Legacy ECDSA on secp256k1 curve | `SignRequest` (legacy) |
| `ecdsa` | ECDSA with domain ID support | `SignRequestV2` |
| `eddsa` | EdDSA (Ed25519) signatures | `SignRequestV2` |

## Initialization

The contract can be initialized with pre-configured guards:

```rust
#[init]
pub fn init(init_guards: HashMap<String, AccountId>, owner: AccountId, pauser: AccountId) -> Self
```

- `init_guards`: Initial mapping of guard IDs to their contract addresses.
- `owner`: The account ID to set as contract owner.
- `pauser`: The account ID authorized to pause the contract.

## Guard Management

### Adding a Guard

Only the contract owner can add a guard. Each guard is identified by a unique ID that must not contain the `#` character.

```rust
pub fn add_guard(&mut self, guard_id: String, guard_address: AccountId)
```

- `guard_id`: The unique ID for the guard (must not contain `#`).
- `guard_address`: The account ID of the guard contract.

### Removing a Guard

Only the contract owner can remove a guard:

```rust
pub fn remove_guard(&mut self, guard_id: String)
```

### Querying a Guard

Returns the account ID of a guard contract. Panics if the guard does not exist.

```rust
pub fn get_guard(&self, guard_id: String) -> AccountId
```

## Guard ID Format

Guard IDs support a hierarchical format using `#` as a separator:

- Simple format: `jwt` - Routes to the guard registered as `jwt`.
- Hierarchical format: `jwt#auth0` - Routes to the guard registered as `jwt`, passing the full ID for sub-routing.

The contract extracts the prefix (before the first `#`) to determine which guard to route to.

## Verification

The `verify` function routes verification requests to the appropriate guard contract:

```rust
pub fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>) -> Promise
```

- `guard_id`: The guard ID (or hierarchical ID) to use for verification.
- `verify_payload`: The JWT token or verification data.
- `sign_payload`: The payload that will be signed if verification succeeds.

Returns a promise that resolves to `(bool, String)` - verification result and user identifier.

## Signing

The `sign` function performs the full authentication and signing flow:

```rust
#[payable]
pub fn sign(&mut self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>, algorithm: String) -> Promise
```

- `guard_id`: The guard ID for JWT verification.
- `verify_payload`: The JWT token to verify.
- `sign_payload`: The data to sign (will be SHA256 hashed before signing).
- `algorithm`: The signature algorithm (`secp256k1`, `ecdsa`, or `eddsa`).

:::info
An attached deposit is required to cover MPC signing costs. The deposit is refunded if verification fails or if the MPC signing fails.
:::

### Signing Flow

1. Validates the signature algorithm.
2. Resolves the guard contract from the guard ID prefix.
3. Calls the guard's `verify` function.
4. On successful verification, validates the returned subject (`sub`) claim.
5. Constructs the signing path as `{guard_id}#{user}`.
6. Forwards the signing request to the MPC contract.
7. Returns the signature or refunds the deposit on failure.

## MPC Configuration

### Setting MPC Address

```rust
pub fn set_mpc_address(&mut self, mpc_address: AccountId)
```

### Setting MPC Key Version

```rust
pub fn set_mpc_key_version(&mut self, mpc_key_version: u32)
```

### Setting MPC Domain ID

```rust
pub fn set_mpc_domain_id(&mut self, mpc_domain_id: u64)
```

## Pause Functionality

The contract supports pausing for emergency situations:

```rust
pub fn pause(&mut self)      // Can only be called by pauser
pub fn unpause(&mut self)    // Can only be called by owner
pub fn set_pauser(&mut self, pauser: AccountId)  // Owner only
pub fn paused(&self) -> bool
```

:::warning
When paused, most contract functions will panic. Only the owner can unpause the contract.
:::

## Contract Upgrades

The owner can upgrade the contract:

```rust
pub fn update_contract(&self) -> Promise
```

This deploys new code and calls the `migrate` function to handle state migrations.

## Administrative Functions

### Changing Owner

```rust
pub fn change_owner(&mut self, new_owner: AccountId)
```

### Execute Arbitrary Calls

Owner-only function to execute calls on other contracts:

```rust
pub fn execute(&self, contract_address: AccountId, method_name: String, args: String, gas: u64) -> Promise
```
