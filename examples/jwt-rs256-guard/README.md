# jwt-rs256-guard

A NEAR contract that verifies JWT tokens signed with RS256 algorithm. You can use this contract to verify your custom JWT tokens.

## Add more custom claims

To add custom claims to the JWT token, you can add them to the `CustomClaims` struct.

```rust
#[derive(Serialize, Deserialize)]
pub struct CustomClaims {
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
    /// The FastAuth claim that specifies the signed payload
    pub fatxn: Vec<u8>,

    // NOTE: Add here your custom claims (if needed)
}
```

## Extend jwt verification

You can extend the `verify_custom_claims` function to verify more custom claims. These claims must be specified in the `CustomClaims` struct mentioned above. Be aware that you'll need to parse your custom claims into Rust structs in order to verify them.

```rust
fn verify_custom_claims(&self, jwt_payload: Vec<u8>, sign_payload: Vec<u8>) -> (bool, String) {
    // Parse the payload into CustomClaims
    let claims: CustomClaims = match serde_json::from_slice(&jwt_payload) {
        Ok(claims) => claims,
        Err(error) => return (false, error.to_string()),
    };

    // Verify your custom claim here

    // Compare fatxn with sign_payload
    if claims.fatxn != sign_payload {
        return (false, "Transaction payload mismatch".to_string());
    }

    // NOTE: Extend here your verification logic (if needed)

    // Return the sub and fatxn fields
    (true, claims.sub)
}
```

By default, the `sub` and `fatxn` claims must be verified. This behavior cannot be changed.

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near build
```

## How to Test Locally?

```bash
cargo test
```
