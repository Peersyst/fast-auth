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
