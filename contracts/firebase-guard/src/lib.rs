use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::{near, AccountId, env, NearToken};
use near_sdk::env::sha256;
use jwt_guard::{JwtGuard, JwtPublicKey};
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds, StorageManagement};
use near_sdk::json_types::{U128};

mod storage_impl;

const JWT_CLAIM_STORAGE: u128 = 128;

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JSON Web Tokens (JWTs) that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
/// The contract stores the RSA public key components (modulus and exponent) used for verification.
#[near(contract_state)]
pub struct FirebaseGuard {
    public_key: JwtPublicKey,
    issuer: String,
    jwt_claims: near_sdk::store::LookupMap<AccountId, Vec<u8>>,
    account_storage_usage: U128,
}

#[derive(near_sdk::BorshStorageKey)]
#[near(serializers = [borsh])]
pub enum Prefix {
    JwtClaims,
}

// Define the default, which automatically initializes the contract
impl Default for FirebaseGuard{
    fn default() -> Self {
        Self {
            public_key: JwtPublicKey{
                n: vec![],
                e: vec![],
            },
            issuer: "".to_string(),
            jwt_claims: near_sdk::store::LookupMap::new(Prefix::JwtClaims),
            account_storage_usage: U128(JWT_CLAIM_STORAGE),
        }
    }
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
    pub fn init(owner: AccountId, issuer: String, n_component: Vec<u8>, e_component: Vec<u8>) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        let mut this = Self {
            public_key: JwtPublicKey {
                n: n_component,
                e: e_component,
            },
            issuer,
            jwt_claims: near_sdk::store::LookupMap::new(Prefix::JwtClaims),
            account_storage_usage: U128(JWT_CLAIM_STORAGE)
        };
        this
    }

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

    pub fn jwt_claim_of(&self, account_id: &AccountId) -> Option<Vec<u8>> {
        self.jwt_claims.get(account_id).cloned()
    }

    /// Sets the issuer of the contract
    /// 
    /// # Arguments
    /// * `issuer` - The issuer of the contract
    /// 
    /// # Panics
    /// Panics if the caller is not the contract owner
    pub fn set_issuer(&mut self, issuer: String) {
        // TODO: self.only_owner(); -> Load from public keys contract
        self.issuer = issuer;
    }

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
    pub fn verify(&self, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String) {
        self.internal_verify(jwt, sign_payload, predecessor)
    }

}

impl JwtGuard for FirebaseGuard {
    /// Gets the current RSA public key components
    ///
    /// # Returns
    /// A tuple containing:
    /// * `Vec<u8>` - The modulus component as a byte vector
    /// * `Vec<u8>` - The exponent component as a byte vector
    fn get_public_key(&self) -> JwtPublicKey {
        JwtPublicKey {
            n: self.public_key.n.clone(),
            e: self.public_key.e.clone(),
        }
    }

    /// Gets the current issuer of the contract
    ///
    /// # Returns
    /// * `String` - The issuer of the contract
    fn get_issuer(&self) -> String {
        self.issuer.clone()
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
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.internal_storage_deposit(account_id)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.internal_storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.internal_storage_unregister()
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.internal_storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.internal_storage_balance_of(&account_id)
    }
}