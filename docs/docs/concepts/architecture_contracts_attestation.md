# Attestation

The `Attestation` contract manages decentralized public key updates through a quorum-based consensus mechanism. Multiple trusted attesters must agree on the same public keys before they are accepted. This contract is used by the `FirebaseGuard` to source its public keys in a trust-minimized manner.

## Features

- Quorum-based public key attestation requiring multiple attesters to agree.
- Role-based access control (DAO, Attester, CodeStager, CodeDeployer, DurationManager, PauseManager, UnpauseManager).
- Pausable contract for emergency situations.
- Upgradable contract with staged deployments.
- Safe attester management that prevents quorum violations.

## Contract State

| Field | Type | Description |
|-------|------|-------------|
| `attestations` | `IterableMap<AccountId, Attestation>` | Current attestations from each attester |
| `quorum` | `u32` | Number of matching attestations required to update keys |
| `public_keys` | `Vector<PublicKey>` | Currently active public keys |

### PublicKey Structure

```rust
pub struct PublicKey {
    n: Vec<u8>,  // RSA modulus
    e: Vec<u8>,  // RSA exponent
}
```

### Attestation Structure

```rust
pub struct Attestation {
    hash: Vec<u8>,            // SHA256 hash of the public keys
    public_keys: Vec<PublicKey>,  // The attested public keys
}
```

## Roles

| Role | Permissions |
|------|-------------|
| `DAO` | Full administrative access, can attest, manage quorum, manage attesters |
| `Attester` | Can submit public key attestations |
| `CodeStager` | Can stage contract code updates |
| `CodeDeployer` | Can deploy staged contract updates |
| `DurationManager` | Can manage upgrade duration settings |
| `PauseManager` | Can pause the contract |
| `UnpauseManager` | Can unpause the contract |

## Initialization

```rust
#[init]
pub fn new(quorum: u32, super_admins: Vec<AccountId>, attesters: Vec<AccountId>) -> Self
```

- `quorum`: Number of attesters that must agree before keys are updated.
- `super_admins`: Accounts with full administrative privileges (also granted DAO role).
- `attesters`: Initial accounts authorized to submit attestations.

**Validation**:
- Quorum must be greater than 0.
- At least one super admin is required.
- Quorum cannot exceed the number of attesters.

## Attestation Process

### Submitting an Attestation

Accounts with the `Attester` or `DAO` role can submit attestations:

```rust
#[pause]
#[access_control_any(roles(Role::Attester, Role::DAO))]
pub fn attest_public_keys(&mut self, public_keys: Vec<PublicKey>)
```

**Process**:
1. Validates that public keys are not empty and all components are valid.
2. Computes the SHA256 hash of the concatenated public key data.
3. Stores the attestation for the calling attester.
4. Counts how many existing attestations have the same hash.
5. If the count reaches quorum:
   - Updates the active public keys.
   - Clears all attestations to prepare for future updates.

### Example Flow

With a quorum of 2 and 3 attesters:

1. **Attester A** submits public keys `[PK1, PK2]` → Attestation stored, count = 1.
2. **Attester B** submits public keys `[PK1, PK2]` → Same hash, count = 2, quorum reached!
3. Public keys updated to `[PK1, PK2]`, all attestations cleared.

If **Attester C** had submitted different keys, the hashes wouldn't match and quorum wouldn't be reached.

## Querying State

### Get Public Keys

```rust
pub fn get_public_keys(&self) -> Vec<PublicKey>
```

Returns the currently active public keys (empty until quorum is first reached).

### Get Attestation

```rust
pub fn get_attestation(&self, account_id: AccountId) -> Option<Attestation>
```

Returns the current attestation from a specific attester.

### Get Quorum

```rust
pub fn get_quorum(&self) -> u32
```

### Get Attesters

```rust
pub fn get_attesters(&self, from_index: u64, limit: u64) -> Vec<AccountId>
```

Paginated list of accounts with the `Attester` role.

## Quorum Management

Only accounts with the `DAO` role can update the quorum:

```rust
#[pause]
#[access_control_any(roles(Role::DAO))]
pub fn set_quorum(&mut self, quorum: u32)
```

**Validation**: Quorum cannot exceed the current number of attesters.

## Attester Management

### Granting Attester Role

```rust
#[pause]
#[access_control_any(roles(Role::DAO))]
pub fn grant_attester(&mut self, account_id: AccountId)
```

### Revoking Attester Role

```rust
#[pause]
#[access_control_any(roles(Role::DAO))]
pub fn revoke_attester(&mut self, account_id: AccountId)
```

**Safety Check**: Cannot revoke an attester if doing so would make the quorum impossible to reach (i.e., if `quorum >= remaining_attesters`).

## Pause Functionality

The contract can be paused to prevent attestations during security incidents:

- **Pause**: Accounts with `PauseManager` or `DAO` role.
- **Unpause**: Accounts with `UnpauseManager` or `DAO` role.

When paused, `attest_public_keys`, `set_quorum`, `grant_attester`, and `revoke_attester` are disabled.

## Security Considerations

### Hash Computation

The hash of public keys is computed by concatenating all modulus (`n`) and exponent (`e`) bytes:

```rust
fn compute_public_keys_hash(&self, public_keys: &[PublicKey]) -> Vec<u8> {
    let mut data = Vec::new();
    for pk in public_keys {
        data.extend_from_slice(&pk.n);
        data.extend_from_slice(&pk.e);
    }
    env::sha256(&data).to_vec()
}
```

This ensures:
- Attesters must agree on the exact same keys in the same order.
- Any difference in key data results in a different hash.

### Quorum Safety

The contract enforces several invariants:
- Quorum can never exceed the number of attesters.
- Revoking an attester is blocked if it would violate the quorum requirement.
- These checks prevent the contract from entering an unrecoverable state.

## Integration with FirebaseGuard

The `FirebaseGuard` contract fetches its public keys from this contract:

1. `FirebaseGuard` calls `attestation_contract.get_public_keys()`.
2. The returned keys are validated and stored in `FirebaseGuard`.
3. These keys are then used to verify Firebase JWT signatures.

This design allows:
- Decentralized key management without trusting a single party.
- Key rotation through attester consensus rather than a single admin.
- Separation of concerns between authentication and key management.
