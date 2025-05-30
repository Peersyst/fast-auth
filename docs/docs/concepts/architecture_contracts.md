# Contracts

FastAuth relies on a set of contracts to ensure payload signatures are valid. Here is the list of contracts:

- `FastAuth` - The main contract. It acts as the gateway to perform signatures via [MPC](./architecture_mpc.md).
- `JwtGuardRouter` - A contract that handles the JWT guard.
- `JwtRS256Guard` - A guard contract that verifies the JWT signature.

## FastAuth

The `FastAuth` contract is the main contract that handles the authentication flow. It is responsible for:

- Receiving a payload from the client.
- Verifying the payload signature.
- Performing the MPC signature.

## JwtGuardRouter

The `JwtGuardRouter` contract is responsible for routing the request to the appropriate guard contract.

## JwtRS256Guard

The JwtRS256Guard is a NEAR smart contract that implements JWT (JSON Web Token) verification using the RS256 algorithm (RSA with SHA-256). The contract is designed to verify the authenticity and integrity of JWT tokens by validating their signatures against stored RSA public key components.

### Features

- Owner-only access control for administrative functions
- Verifies the JWT signature using the RS256 algorithm
- Validates custom claims

### Contract State

The contract maintains the following state variables:

- `n_component`: Vector of bytes representing the RSA public key modulus
- `e_component`: Vector of bytes representing the RSA public key exponent
- `owner`: AccountId of the contract owner with administrative privileges

This variables can be set in the `init` function.

### Custom Claims

The contract defines a `CustomClaims` structure for FastAuth JWT tokens:

```rust
struct CustomClaims {
    sub: String,    // Subject identifier claim
}
```

### Reference

#### Initialization

- `init(owner: AccountId, n_component: Vec<u8>, e_component: Vec<u8>)`: Initializes the contract with an owner and RSA public key components

#### Owner Management

- `owner()`: Returns the current contract owner
- `change_owner(new_owner: AccountId)`: Transfers ownership to a new account
- `only_owner()`: Internal function to enforce owner-only access control

#### Public Key Management

- `set_public_key(n: Vec<u8>, e: Vec<u8>)`: Updates the RSA public key components
- `get_public_key()`: Returns the current RSA public key components as a tuple

#### JWT Verification

- `verify(jwt: String, sign_payload: Vec<u8>)`: Main verification function that:
    1. Validates the JWT signature
    2. Verifies custom claims
    3. Returns a tuple of (bool, String) indicating verification status and subject claim
