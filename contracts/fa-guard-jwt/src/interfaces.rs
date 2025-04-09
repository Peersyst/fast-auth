use near_sdk::ext_contract;

/// External contract trait for JWT signature verification algorithms
/// This trait defines the interface that must be implemented by contracts
/// that verify JWT signatures using specific algorithms (e.g. RS256)
#[ext_contract(jwt_algorithm)]
pub trait JwtAlgorithm {
    /// Verifies a JWT signature using RSA public key components
    ///
    /// # Arguments
    /// * `n` - The modulus component of the RSA public key as a byte vector
    /// * `e` - The exponent component of the RSA public key as a byte vector
    /// * `token` - The full JWT string to verify
    ///
    /// # Returns
    /// A boolean indicating if the signature is valid (true) or invalid (false)
    fn verify_signature(&self, n: Vec<u8>, e: Vec<u8>, token: String) -> bool;
}
