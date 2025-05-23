# jwt-rs256-guard

A NEAR contract that verifies JWT tokens signed with RS256 algorithm. You can use this contract to verify your custom JWT tokens.

## Specify custom claims

To add custom claims to the JWT token, you can add them to the `CustomClaims` struct.

```rust
pub struct CustomClaims {
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
}
```

## Verify `sign_payload`

You can verify or skip the `sign_payload` verification by adding logic to the `verify_custom_claims` function.

```rust
fn verify_custom_claims(&self, jwt_payload: Vec<u8>, sign_payload: Vec<u8>) -> (bool, String) {
        // Parse the payload into CustomClaims
        let claims: CustomClaims = match serde_json::from_slice(&jwt_payload) {
            Ok(claims) => claims,
            Err(error) => return (false, error.to_string()),
        };

        // NOTE: Verify your custom claim here

        // Return the sub and fatxn fields
        (true, claims.sub)
    }
```

By default, only the `sub` claim is verified. This behavior cannot be changed.

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near build
```

## How to Test Locally?

```bash
cargo test
```
