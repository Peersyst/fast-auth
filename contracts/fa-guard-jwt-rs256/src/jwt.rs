use serde::{Deserialize, Serialize};

/// Custom claims structure for FastAuth JWT tokens
#[derive(Serialize, Deserialize)]
pub struct FaJwtCustomClaims {
    /// The FastAuth permissions claim that specifies what actions are allowed
    pub fap: String,
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
}