# JwtGuardRouter

The `JwtGuardRouter` contract acts as a registry and router for multiple JWT guard contracts. It enables flexible authentication methods by delegating JWT verification to the appropriate guard based on the provided guard name. This contract is typically registered as the `jwt` guard in the `FastAuth` contract.

## Features

- Owner-only access control for administrative functions (adding/removing guards, changing owner).
- Maintains a mapping of guard names to their corresponding guard contract account IDs.
- Delegates JWT verification to the specified guard contract.
- Validates guard name format to ensure proper routing.
- Supports contract upgrades with state migration.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `guards` | `LookupMap<String, AccountId>` | Mapping from guard names to their contract account IDs |
| `owner` | `AccountId` | The contract owner with administrative privileges |

## Initialization

```rust
#[init]
pub fn init(owner: AccountId) -> Self
```

Initializes the contract with the specified owner and an empty guards map.

## Adding a Guard

Only the contract owner can add guards. Adding a guard requires an attached deposit to cover storage costs plus a contingency deposit.

```rust
#[payable]
pub fn add_guard(&mut self, guard_name: String, guard_account: AccountId)
```

- `guard_name`: The unique name for the guard (must not contain `#`, max 2048 bytes).
- `guard_account`: The account ID of the guard contract (max 64 bytes).

:::info
The required deposit is calculated as:

```
env::storage_byte_cost() * (GUARD_NAME_MAX_BYTES_LENGTH + MAX_ACCOUNT_BYTES_LENGTH) + CONTINGENCY_DEPOSIT
```

| Constant | Value |
|----------|-------|
| `GUARD_NAME_MAX_BYTES_LENGTH` | 2048 bytes |
| `MAX_ACCOUNT_BYTES_LENGTH` | 64 bytes |
| `CONTINGENCY_DEPOSIT` | 1 NEAR |
:::

### Validation Rules

- Guard name must not contain the `#` character.
- Guard name must not exceed 2048 bytes.
- Guard account must not exceed 64 bytes.
- Guard name must not already exist in the registry.

## Removing a Guard

Only the contract owner can remove guards:

```rust
pub fn remove_guard(&mut self, guard_name: String)
```

Panics if the guard does not exist.

## Querying a Guard

Returns the account ID of a guard contract. Panics if the guard does not exist.

```rust
pub fn get_guard(&self, guard_name: String) -> AccountId
```

## Guard ID Format

The router expects guard IDs in the format `jwt#GUARD_NAME` where:
- `jwt` is the prefix that routes to this contract (from `FastAuth`).
- `GUARD_NAME` is the actual guard name registered in this router.

For example, if a guard named `auth0` is registered, the full guard ID used with `FastAuth` would be `jwt#auth0`.

## Routing Verification

The `verify` function routes JWT verification requests to the appropriate guard:

```rust
pub fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>, predecessor: AccountId) -> Promise
```

- `guard_id`: The full guard ID in format `jwt#GUARD_NAME`.
- `verify_payload`: The JWT token to verify.
- `sign_payload`: The payload to be signed by the MPC.
- `predecessor`: The original caller's account ID (passed through from `FastAuth`).

### Verification Flow

1. Validates the guard ID format (`jwt#GUARD_NAME`).
2. Extracts the guard name from the ID.
3. Looks up the guard contract address.
4. Calls the guard's `verify` function.
5. Processes the result in a callback and returns `(bool, String, String)`:
   - Boolean: verification success
   - String: user subject claim
   - String: guard name

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

This deploys new code and calls the `migrate` function to handle state migrations.
