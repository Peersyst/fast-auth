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