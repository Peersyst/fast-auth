use std::slice::Iter;
use borsh::{BorshDeserialize};
use near_sdk::{near, AccountId, env, PanicOnDefault, Promise, Gas, ext_contract};
use near_sdk::serde_json;
use base_jwt_guard::{JwtGuard, JwtPublicKey};
use base_jwt_guard::assert_valid_public_key;
use near_plugins::{access_control, access_control_any, AccessControlRole, AccessControllable, Upgradable};
use serde::{Deserialize, Serialize};
use crate::config::{CustomIssuerGuardConfig, RolesConfig};
use crate::error::CustomIssuerGuardError;

mod config;
mod error;
mod utils;

// External contract interface for AttestationContract
#[ext_contract(attestation_contract)]
pub trait AttestationContract {
    fn get_public_keys(&self) -> Vec<JwtPublicKey>;
}

#[near(serializers = [json])]
#[derive(AccessControlRole, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Role {
    DAO,
    CodeStager,
    CodeDeployer,
    DurationManager,
}

impl Role {
    pub fn iterator() -> Iter<'static, Role> {
        static ROLES: [Role; 4] = [
            Role::DAO,
            Role::CodeStager,
            Role::CodeDeployer,
            Role::DurationManager,
        ];
        ROLES.iter()
    }
}

/// Custom claims structure for FastAuth Auth0 JWT tokens
#[derive(Serialize, Deserialize)]
pub struct CustomClaims {
    pub fatxn: Vec<u8>,
}

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JSON Web Tokens (JWTs) that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
/// The contract stores the RSA public key components (modulus and exponent) used for verification.
#[access_control(role_type(Role))]
#[derive(PanicOnDefault, Upgradable)]
#[upgradable(access_control_roles(
    code_stagers(Role::CodeStager, Role::DAO),
    code_deployers(Role::CodeDeployer, Role::DAO),
    duration_initializers(Role::DurationManager, Role::DAO),
    duration_update_stagers(Role::DurationManager, Role::DAO),
    duration_update_appliers(Role::DurationManager, Role::DAO),
))]
#[near(contract_state)]
pub struct CustomIssuerGuard {
    public_keys: Vec<JwtPublicKey>,
    attestation_contract: AccountId,
}

#[derive(near_sdk::BorshStorageKey)]
#[near(serializers = [borsh])]
pub enum Prefix {
    JwtClaims,
    JwtHashClaims,
}

#[near(serializers = [json, borsh])]
impl CustomIssuerGuard {
    /// Initializes the contract with an owner and RSA public key components
    ///
    /// # Arguments
    /// * `n_component` - The RSA public key modulus as a byte vector
    /// * `e_component` - The RSA public key exponent as a byte vector
    ///
    /// # Panics
    /// Panics if the contract is already initialized
    #[init]
    pub fn init(config: CustomIssuerGuardConfig, attestation_contract: AccountId) -> Self {
        require_err!(
            !env::state_exists(),
            CustomIssuerGuardError::ContractAlreadyInitialized
        );
        config.assert_valid();
        let mut this = Self {
            public_keys: config.public_keys,
            attestation_contract,
        };
        this.init_acl(config.roles);
        this
    }

    /// Initializes the ACL
    /// # Arguments
    /// * `roles` - The RolesConfig
    fn init_acl(&mut self, roles: RolesConfig) {
        let mut acl = self.acl_get_or_init();

        for super_admin in roles.super_admins.iter() {
            require_err!(
                acl.add_super_admin_unchecked(super_admin),
                CustomIssuerGuardError::FailedToInitializeSuperAdmin
            );
        }
        for (role, account_ids) in roles.admins.into_iter() {
            for account_id in account_ids {
                require_err!(
                    acl.add_admin_unchecked(role, &account_id),
                    CustomIssuerGuardError::FailedToAddAdmin
                );
            }
        }
        for (role, account_ids) in roles.grantees.into_iter() {
            for account_id in account_ids {
                require_err!(
                    acl.grant_role_unchecked(role, &account_id),
                    CustomIssuerGuardError::FailedToGrantRole
                );
            }
        }
    }

    /// Fetches public keys from the AttestationContract and sets them in a callback
    /// # Returns
    /// * `Promise` - A promise that resolves when the public keys are fetched and set
    pub fn set_public_keys(&mut self) -> Promise {
        attestation_contract::ext(self.attestation_contract.clone())
            .with_static_gas(Gas::from_tgas(5))
            .get_public_keys()
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(5))
                    .on_set_public_keys_callback()
            )
    }

    /// Callback to handle the public keys fetched from AttestationContract
    /// # Arguments
    /// * `public_keys` - The public keys fetched from the AttestationContract
    /// # Panics
    /// Panics if the callback result is an error or if public key validation fails
    #[private]
    pub fn on_set_public_keys_callback(
        &mut self,
        #[callback_result] public_keys_result: Result<Vec<JwtPublicKey>, near_sdk::PromiseError>,
    ) {
        match public_keys_result {
            Ok(attestation_keys) => {
                // Convert AttestationPublicKey to JwtPublicKey
                let jwt_public_keys: Vec<JwtPublicKey> = attestation_keys
                    .into_iter()
                    .map(|key| JwtPublicKey {
                        n: key.n,
                        e: key.e,
                    })
                    .collect();

                // Validate all public keys
                for public_key in jwt_public_keys.iter() {
                    assert_valid_public_key(public_key.clone());
                }

                // Set the public keys
                self.public_keys = jwt_public_keys;
                env::log_str("Public keys successfully updated from AttestationContract");
            }
            Err(e) => {
                env::panic_str(&format!("Failed to fetch public keys from AttestationContract: {:?}", e));
            }
        }
    }

    /// Sets the attestation contract address
    /// # Arguments
    /// * `attestation_contract` - The new attestation contract account ID
    /// # Panics
    /// Panics if the caller is not authorized (DAO role)
    #[access_control_any(roles(Role::DAO))]
    pub fn set_attestation_contract(&mut self, attestation_contract: AccountId) {
        self.attestation_contract = attestation_contract;
        env::log_str("Attestation contract address updated");
    }

    /// Gets the current attestation contract address
    /// # Returns
    /// * `AccountId` - The current attestation contract account ID
    pub fn get_attestation_contract(&self) -> AccountId {
        self.attestation_contract.clone()
    }

    /// Verifies a JWT token and its custom claims
    ///
    /// # Arguments
    /// * `jwt` - The JWT token to verify as a string
    /// * `sign_payload` - The payload to verify against the JWT
    ///
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    pub fn verify(&self, issuer: String, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String) {
        self.internal_verify(issuer, jwt, sign_payload, predecessor)
    }

}

#[near]
impl JwtGuard for CustomIssuerGuard {
    /// Gets the current RSA public key components
    ///
    /// # Returns
    /// A tuple containing:
    /// * `Vec<u8>` - The modulus component as a byte vector
    /// * `Vec<u8>` - The exponent component as a byte vector
    fn get_public_keys(&self) -> Vec<JwtPublicKey> {
        self.public_keys.clone()
    }

    /// Verifies custom claims in the JWT payload
    /// # Arguments
    /// * `jwt` - JWT token
    /// * `jwt_payload` - Decoded JWT payload as bytes
    /// * `sign_payload` - Payload to verify against the JWT fatxn claim
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    #[private]
    fn verify_custom_claims(&self, _jwt: String, jwt_payload: Vec<u8>, sign_payload: Vec<u8>, _predecessor: AccountId) -> (bool, String) {
        // Parse the payload into CustomClaims
        let claims: CustomClaims = match serde_json::from_slice(&jwt_payload) {
            Ok(claims) => claims,
            Err(error) => return (false, error.to_string()),
        };

        // Compare fatxn with sign_payload
        if claims.fatxn != sign_payload {
            return (false, "Transaction payload mismatch".to_string());
        }
        // Return the sub and fatxn fields
        (true, "".parse().unwrap())
    }
}
