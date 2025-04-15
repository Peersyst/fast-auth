use serde::Deserialize;

/// Represents the claims contained in a JWT payload
/// 
/// # Fields
/// * `fap` - The permissions claim that specifies what actions are allowed
/// * `fau` - The user identifier claim that specifies which user the token belongs to
#[derive(Deserialize)]
pub struct FaJwtCustomClaims {
    pub fap: String,
    pub sub: String,
}

/// Represents the header claims contained in a JWT header
/// 
/// # Fields
/// * `alg` - The algorithm claim that specifies the algorithm used to sign the token
/// * `typ` - The type claim that specifies the type of the token
#[derive(Deserialize)]
pub struct FaJwtHeaderClaims {
    pub alg: String,
    // pub typ: String,
}