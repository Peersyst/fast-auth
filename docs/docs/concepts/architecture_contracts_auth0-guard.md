# Auth0Guard

The `Auth0Guard` contract verifies that a JWT forged through Auth0 is valid. This contract is used by the [`FastAuth`](./architecture_contracts_fa.md) contract to verify the JWT token before performing the MPC signature.

## Features

- Owner-only access control for administrative functions, such as updating the RSA public key components.
- Verifies the JWT signature using the RS256 algorithm.
- Validates custom claims.

## Contract state

- `n_component`: Vector of bytes representing the RSA public key modulus
- `e_component`: Vector of bytes representing the RSA public key exponent
- `owner`: AccountId of the contract owner with administrative privileges

## Public key management

In case of a security breach or a key rotation policy, the contract owner can update the RSA public key components.

:::warning
Only the **owner** of the contract can update the RSA public key components.
:::

```rust
pub fn set_public_key(&mut self, n: Vec<u8>, e: Vec<u8>) {
    self.only_owner();
    self.n_component = n;
    self.e_component = e;
}
```

## Verification logic

The JWT verification is implemented in the `verify` function. This function is called by the [`FastAuth`](./architecture_contracts_fa.md) contract to verify the JWT token before performing the MPC signature.

```rust
 pub fn verify(&self, jwt: String, sign_payload: Vec<u8>) -> (bool, String)
```

It accepts two arguments:

- `jwt`: The JWT token to verify.
- `sign_payload`: The payload to sign.

The function returns a tuple of two elements:

- `bool`: A boolean indicating if the JWT is valid.
- `String`: The subject claim of the JWT.

In order to determine if a JWT is valid, the contract verifies the following:

- The JWT is forged with the Auth0 public key components.
- The `fatxn` claim is present in the JWT.
- The `fatxn` claim matches the `sign_payload` argument.
