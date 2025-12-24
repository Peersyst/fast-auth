use crypto_bigint::{BoxedUint, Odd};
use near_sdk::{env, AccountId};
use jwt_guard::JwtPublicKey;
use crate::{error::FirebaseGuardError, require_err};

/// Asserts that the account ID is valid
/// # Arguments
/// * `account_id` - The AccountId to assert
/// # Panics
/// * If the account ID is invalid
pub fn assert_valid_account_id(account_id: &AccountId) {
    require_err!(
        env::is_valid_account_id(account_id.as_bytes()),
        FirebaseGuardError::InvalidAccountId
    );
}

/// Asserts that the public key is valid
/// # Arguments
/// * `public_key` - The JwtPublicKey to assert
/// # Panics
/// * If the public key is invalid
pub fn assert_valid_public_key(public_key: JwtPublicKey)  {
    require_err!(
        public_key.n.len() == 256,
        FirebaseGuardError::InvalidPublicKeyNLength
    );
    let n_int = BoxedUint::from_be_slice(&public_key.n, 2048).unwrap();

    require_err!(
        Odd::new(n_int).is_some().unwrap_u8() == 1,
        FirebaseGuardError::InvalidPublicKeyNOdd
    );
    let allowed_e: &[&[u8]] = &[&[0x01, 0x00, 0x01]];
    require_err!(
        allowed_e.contains(&public_key.e.as_slice()),
        FirebaseGuardError::InvalidPublicKeyELength
    );
}
