use near_sdk::{near, AccountId, env, StorageUsage};
use near_sdk::env::sha256;
use jwt_guard::{JwtGuard, JwtPublicKey};
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds, StorageManagement};

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
            jwt_claims: near_sdk::store::LookupMap::new(Prefix::JwtClaims)
        }
    }
}

#[near]
impl FirebaseGuard {
    /// Initializes the contract with an owner and RSA public key components
    /// 
    /// # Arguments
    /// * `n_component` - The RSA public key modulus as a byte vector
    /// * `e_component` - The RSA public key exponent as a byte vector
    /// 
    /// # Panics
    /// Panics if the contract is already initialized
    #[private]
    #[init]
    pub fn init(owner: AccountId, issuer: String, n_component: Vec<u8>, e_component: Vec<u8>) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            public_key: JwtPublicKey {
                n: n_component,
                e: e_component,
            },
            issuer,
            jwt_claims: near_sdk::store::LookupMap::new(Prefix::JwtClaims)
        }
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
        // TODO: Storage management
        assert_eq!(oidc_token_hash.len(), 32, "OIDC token hash must be 32 bytes");
        self.jwt_claims.insert(env::predecessor_account_id(), oidc_token_hash);
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
        let claim_hash = self.jwt_claims.get(&predecessor);
        if claim_hash.is_none() {
            return (false, format!("Claim {} not found", predecessor));
        }
        let jwt_hash = sha256(jwt_payload.as_slice());
        if !jwt_hash.eq(claim_hash.unwrap()) {
            return (false, format!("Claim {} not matching hash", predecessor));
        }
        (true, "".parse().unwrap())
    }
}