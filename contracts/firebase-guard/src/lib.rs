use std::slice::Iter;
use borsh::{BorshDeserialize};
use near_sdk::{near, AccountId, env, NearToken, PanicOnDefault, Promise, Gas, ext_contract};
use near_sdk::env::sha256;
use jwt_guard::{JwtGuard, JwtPublicKey};
use jwt_guard::assert_valid_public_key;
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds, StorageManagement};
use near_sdk::json_types::{U128};
use near_plugins::{access_control, access_control_any, AccessControlRole, AccessControllable, Pausable, Upgradable};
use schemars::JsonSchema;
use crate::config::{FirebaseGuardConfig, RolesConfig};
use crate::error::FirebaseGuardError;

mod storage_impl;
mod config;
mod error;
mod utils;

// External contract interface for AttestationContract
#[ext_contract(attestation_contract)]
pub trait AttestationContract {
    fn get_public_keys(&self) -> Vec<AttestationPublicKey>;
}

// PublicKey structure from AttestationContract
#[derive(near_sdk::serde::Deserialize, near_sdk::serde::Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct AttestationPublicKey {
    pub n: Vec<u8>,
    pub e: Vec<u8>,
}

const JWT_CLAIM_STORAGE: u128 = 128;

#[near(serializers = [json])]
#[derive(AccessControlRole, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Role {
    DAO,
    CodeStager,
    CodeDeployer,
    DurationManager,
    PublicKeyManager,
}

impl Role {
    pub fn iterator() -> Iter<'static, Role> {
        static ROLES: [Role; 5] = [
            Role::DAO,
            Role::CodeStager,
            Role::CodeDeployer,
            Role::DurationManager,
            Role::PublicKeyManager,
        ];
        ROLES.iter()
    }
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
pub struct FirebaseGuard {
    public_keys: Vec<JwtPublicKey>,
    jwt_claims: near_sdk::store::LookupMap<AccountId, Vec<u8>>,
    account_storage_usage: U128,
    attestation_contract: AccountId,
}

#[derive(near_sdk::BorshStorageKey)]
#[near(serializers = [borsh])]
pub enum Prefix {
    JwtClaims,
}

#[near(serializers = [json, borsh])]
impl FirebaseGuard {
    /// Initializes the contract with an owner and RSA public key components
    ///
    /// # Arguments
    /// * `n_component` - The RSA public key modulus as a byte vector
    /// * `e_component` - The RSA public key exponent as a byte vector
    ///
    /// # Panics
    /// Panics if the contract is already initialized
    #[init]
    pub fn init(config: FirebaseGuardConfig, attestation_contract: AccountId) -> Self {
        require_err!(
            !env::state_exists(),
            FirebaseGuardError::ContractAlreadyInitialized
        );
        config.assert_valid();
        let mut this = Self {
            public_keys: config.public_keys,
            jwt_claims: near_sdk::store::LookupMap::new(Prefix::JwtClaims),
            account_storage_usage: U128(JWT_CLAIM_STORAGE),
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
                acl.add_super_admin_unchecked(&super_admin),
                FirebaseGuardError::FailedToInitializeSuperAdmin
            );
        }
        for (role, account_ids) in roles.admins.into_iter() {
            for account_id in account_ids {
                require_err!(
                    acl.add_admin_unchecked(role, &account_id),
                    FirebaseGuardError::FailedToAddAdmin
                );
            }
        }
        for (role, account_ids) in roles.grantees.into_iter() {
            for account_id in account_ids {
                require_err!(
                    acl.grant_role_unchecked(role, &account_id),
                    FirebaseGuardError::FailedToGrantRole
                );
            }
        }
    }

    /// Gets the current storage usage of the contract
    /// 
    /// # Returns
    /// * `U128` - The current storage usage of the contract in bytes
    ///
    pub fn get_account_storage_usage(&self) -> U128 {
        self.account_storage_usage.clone()
    }

    /// Claims an OIDC token by storing its hash for the caller.
    ///
    /// This method allows the caller (identified by the sender's account ID) to store a hash of their OIDC token.
    /// The hash provided must be exactly 32 bytes long.
    ///
    /// # Arguments
    /// * `oidc_token_hash` - A 32-byte vector containing the hash of the OIDC token.
    ///
    /// # Panics
    /// Panics if the `oidc_token_hash` is not exactly 32 bytes.
    ///
    /// # Storage Usage
    /// This method consumes storage space associated with the sender's `AccountId`.
    pub fn claim_oidc(&mut self, oidc_token_hash: Vec<u8>) {
        assert_eq!(oidc_token_hash.len(), 32, "OIDC token hash must be 32 bytes");
        let account_id = env::predecessor_account_id();
        self.internal_unwrap_jwt_claim(&account_id);
        self.jwt_claims.insert(account_id, oidc_token_hash);
    }

    /// Gets the JWT claim of an account
    /// 
    /// # Arguments
    /// * `account_id` - The account ID of the account for which to get the JWT claim
    /// 
    /// # Returns
    /// * `Option<Vec<u8>>` - The JWT claim of the account, if it exists, or `None` otherwise
    ///
    pub fn jwt_claim_of(&self, account_id: &AccountId) -> Option<Vec<u8>> {
        self.jwt_claims.get(account_id).cloned()
    }

    /// Fetches public keys from the AttestationContract and sets them in a callback
    /// # Returns
    /// * `Promise` - A promise that resolves when the public keys are fetched and set
    /// # Panics
    /// Panics if the caller is not authorized (PublicKeyManager or DAO role)
    #[access_control_any(roles(Role::PublicKeyManager, Role::DAO))]
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
        #[callback_result] public_keys_result: Result<Vec<AttestationPublicKey>, near_sdk::PromiseError>,
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

    /// Unwraps the JWT claim of an account
    /// 
    /// # Arguments
    /// * `account_id` - The account ID of the account for which to unwrap the JWT claim
    /// 
    /// # Panics
    /// Panics if the account is not registered
    ///
    fn internal_unwrap_jwt_claim(&self, account_id: &AccountId) -> &Vec<u8> {
        match self.jwt_claims.get(account_id) {
            Some(jwt_hash) => jwt_hash,
            None => {
                env::panic_str(format!("The account {} is not registered", &account_id).as_str())
            }
        }
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

impl JwtGuard for FirebaseGuard {
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
    /// * `jwt_payload` - Decoded JWT payload as bytes
    /// * `sign_payload` - Payload to verify against the JWT fatxn claim
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    fn verify_custom_claims(&self, jwt_payload: Vec<u8>, _sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String) {
        // Parse the payload into CustomClaims
        let claim_hash = self.internal_unwrap_jwt_claim(&predecessor);
        let jwt_hash = sha256(jwt_payload);
        if !jwt_hash.eq(claim_hash) {
            return (false, format!("Claim for user {} not matching hash {:?}", predecessor, jwt_hash));
        }
        (true, "".parse().unwrap())
    }
}


#[near]
impl StorageManagement for FirebaseGuard {
    /// Registers an account with the contract.
    ///
    /// This method allows the caller to register an account with the contract. The account must be
    /// registered before it can be used with the contract.
    ///
    /// # Arguments
    /// * `account_id` - The account ID of the account to register.
    ///
    /// # Panics
    /// Panics if the account is already registered.
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.internal_storage_deposit(account_id)
    }

    /// Withdraws funds from the contract.
    ///
    /// This method allows the caller to withdraw funds from the contract. The caller must be the
    /// contract owner or an account that has been registered with the contract.
    ///
    /// # Arguments
    /// * `amount` - The amount of funds to withdraw. If not specified, all available funds will be withdrawn.
    ///
    /// # Panics
    /// Panics if the caller is not the contract owner and the account is not registered.
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.internal_storage_withdraw(amount)
    }

    /// Unregisters an account from the contract.
    ///
    /// This method allows the caller to unregister an account from the contract. The account must be
    /// registered before it can be unregistered.
    ///
    /// # Arguments
    /// * `force` - If `true`, the account will be unregistered even if it still has funds in the contract. If `false` (the default), the account must have no funds in the contract.
    ///
    /// # Panics
    /// Panics if the account is not registered.
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.internal_storage_unregister()
    }

    /// Returns the balance of an account in the contract.
    ///
    /// This method allows the caller to query the balance of an account in the contract. The account must be
    /// registered before it can be queried.
    ///
    /// # Arguments
    /// * `account_id` - The account ID of the account to query.
    ///
    /// # Returns
    /// * `StorageBalance` - The balance of the account in the contract.
    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.internal_storage_balance_bounds()
    }

    /// Returns the balance of an account in the contract.
    ///
    /// This method allows the caller to query the balance of an account in the contract. The account must be
    /// registered before it can be queried.
    ///
    /// # Arguments
    /// * `account_id` - The account ID of the account to query.
    ///
    /// # Returns
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.internal_storage_balance_of(&account_id)
    }
}