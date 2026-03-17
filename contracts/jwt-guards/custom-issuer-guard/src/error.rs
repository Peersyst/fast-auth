use std::fmt;

/// Typed errors for CustomIssuerGuard
#[derive(Debug)]
pub enum CustomIssuerGuardError {
    // Generic
    ContractAlreadyInitialized,
    InvalidAccountId,

    // ACL
    SuperAdminsMustBeNonEmpty,
    FailedToInitializeSuperAdmin,
    FailedToAddAdmin,
    FailedToGrantRole,
}

impl fmt::Display for CustomIssuerGuardError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use CustomIssuerGuardError::*;
        match self {
            // Generic
            ContractAlreadyInitialized => write!(f, "Contract is already initialized"),
            InvalidAccountId => write!(f, "The account ID is invalid"),

            // ACL
            SuperAdminsMustBeNonEmpty => write!(f, "The super admins must be a non-empty set"),
            FailedToInitializeSuperAdmin => write!(f, "Failed to initialize super admin"),
            FailedToAddAdmin => write!(f, "Failed to add admin"),
            FailedToGrantRole => write!(f, "Failed to grant role"),
        }
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
