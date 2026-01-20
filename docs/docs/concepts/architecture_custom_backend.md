# Custom Backend

When integrating FastAuth, you can choose to use a custom backend to handle the authentication and authorization of users. This is useful if you want to use a different authentication provider or implement custom authorization logic beyond what the standard guards provide.

:::warning
Implementing a custom backend requires additional development and maintenance, as you will need to implement the authentication and authorization logic for your specific use case.
:::

## When to Use a Custom Backend

Consider a custom backend when:

- You need custom authorization rules beyond JWT verification.
- You want to implement rate limiting or additional security checks.
- You need to integrate with an identity provider not supported by existing guards.
- You want to add business logic before allowing transactions.

## Architecture Options

### Option 1: Custom Guard Contract

Deploy your own guard contract that implements the `JwtGuard` trait:

```rust
pub trait JwtGuard {
    fn get_public_keys(&self) -> Vec<JwtPublicKey>;
    fn verify_custom_claims(&self, jwt: String, jwt_payload: Vec<u8>, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String);
}
```

Register your guard with `JwtGuardRouter` or directly with `FastAuth`.

### Option 2: Off-Chain Backend + CustomIssuerGuard

Use an off-chain server to:
1. Authenticate users with your identity provider.
2. Perform custom authorization checks.
3. Issue JWTs that can be verified by `CustomIssuerGuard`.

## Aspects to Consider

### Authentication

- Implement secure login/logout flows.
- Handle token refresh and session management.
- Ensure proper identity verification before issuing JWTs.

### Authorization

- Define what actions users can perform.
- Implement proper scope and permission checks.
- Consider transaction-level authorization (what can be signed).

### Security

- **Never expose private keys or secrets to the client.**
- Use HTTPS for all communications.
- Implement proper CORS policies.
- Validate all inputs server-side.
- Use secure JWT signing (RS256 recommended).

### Key Management

For custom guards, consider:
- How public keys will be managed and rotated.
- Whether to use owner-managed keys (like `Auth0Guard`) or attestation-based keys (like `FirebaseGuard`).
- Key rotation procedures and emergency response plans.

## Integration Steps

1. **Choose your approach**: Custom guard or off-chain backend.
2. **Implement authentication**: Connect to your identity provider.
3. **Configure JWT claims**: Ensure JWTs include necessary claims (`sub`, `iss`, `exp`, and any custom claims).
4. **Deploy/Configure guard**: Either deploy a custom guard or configure `CustomIssuerGuard` with your public keys.
5. **Register with router**: Add your guard to `JwtGuardRouter` or `FastAuth`.
6. **Test thoroughly**: Verify the complete authentication and signing flow.

## Example

If you want to integrate a custom backend, you can follow this [integration guide](../integrations/custom-backend). It will guide you through the process of integrating a custom backend with FastAuth.

If you are looking for an example of a custom backend, you can check out the [Express](../integrations/custom-backend-express) example. It shows how to develop a custom backend using [Express.js](https://expressjs.com/), taking care of the authentication and authorization logic.

## Guard Interface

If implementing a custom guard, your contract must provide:

```rust
pub fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String)
```

Where the return value is:
- `bool`: Whether verification succeeded.
- `String`: The user's subject identifier (used for key derivation).

The `predecessor` parameter contains the original caller's account ID, which is useful for claim-based authentication models where users must pre-register.
