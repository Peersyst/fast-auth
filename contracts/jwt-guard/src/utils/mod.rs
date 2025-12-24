use crate::core::JwtPublicKey;
use crypto_bigint::{BoxedUint, Odd};
use near_sdk::require as require_err;

/// Asserts that the public key is valid
/// # Arguments
/// * `public_key` - The JwtPublicKey to assert
/// # Panics
/// * If the public key is invalid
pub fn assert_valid_public_key(public_key: JwtPublicKey)  {
    require_err!(
        public_key.n.len() == 256,
        "invalid n component length"
    );
    let n_int = BoxedUint::from_be_slice(&public_key.n, 2048).unwrap();

    require_err!(
        Odd::new(n_int).is_some().unwrap_u8() == 1,
        "modulus must be odd"
    );
    let allowed_e: &[&[u8]] = &[&[0x01, 0x00, 0x01]];
    require_err!(
        allowed_e.contains(&public_key.e.as_slice()),
        "invalid e component"
    );
}
