use std::fmt;

/// Typed errors for Staking Distributor
#[derive(Debug)]
pub enum FirebaseGuardError {
    // Generic
    ContractAlreadyInitialized,
    InvalidAccountId,

    // PublicKey
    InvalidPublicKeyNLength,
    InvalidPublicKeyNOdd,
    InvalidPublicKeyELength,

    // ACL
    SuperAdminsMustBeNonEmpty,
    FailedToInitializeSuperAdmin,
    FailedToAddAdmin,
    FailedToGrantRole,
}

impl fmt::Display for FirebaseGuardError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use FirebaseGuardError::*;
        match self {
            // Generic
            ContractAlreadyInitialized => write!(f, "Contract is already initialized"),
            InvalidAccountId => write!(f, "The account ID is invalid"),

            // Amount
            InvalidPublicKeyNLength => write!(f, "The n factor of the public key must be 2048 bits"),
            InvalidPublicKeyNOdd => write!(f, "The n factor of the public key must be odd"),
            InvalidPublicKeyELength => write!(f, "The e factor of the public key must be 3 bytes long"),

            // ACL
            SuperAdminsMustBeNonEmpty => write!(f, "The super admins must be a non-empty set"),
            FailedToInitializeSuperAdmin => write!(f, "Failed to initialize super admin"),
            FailedToAddAdmin => write!(f, "Failed to add admin"),
            FailedToGrantRole => write!(f, "Failed to grant role"),
        }
    }
}

impl FirebaseGuardError {
    #[inline]
    pub fn msg(&self) -> String {
        self.to_string()
    }
}

/// Use typed errors with NEAR's `require!` internally.
/// Example: `require_err!(amount > 0, StakingDistributorError::InvalidAmount);`
#[macro_export]
macro_rules! require_err {
    ($cond:expr, $err:expr) => {{
        near_sdk::require!($cond, $err.to_string());
    }};
}
