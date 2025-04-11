// Find all our documentation at https://docs.near.org
use near_sdk::{log, near, AccountId, Promise, PromiseError, base64, env, serde_json};
use near_sdk::base64::Engine;
use std::collections::HashMap;
use crate::interfaces::jwt_algorithm;
use crate::claims::{FaJwtCustomClaims, FaJwtHeaderClaims};

pub mod claims;
pub mod interfaces;
pub mod claims;

/// FaJwtGuard is a NEAR smart contract that handles JWT verification using RSA public keys.
/// It maintains a registry of JWT algorithm implementations and the RSA public key components
/// used for signature verification.
#[near(contract_state)]
pub struct FaJwtGuard {
    /// Mapping of algorithm names (e.g. "RS256") to their implementation contract accounts
    implementations: HashMap<String, AccountId>,
    /// The modulus (n) component of the RSA public key as a byte vector
    n: Vec<u8>,
    /// The exponent (e) component of the RSA public key as a byte vector 
    e: Vec<u8>,
    /// The owner of the contract
    owner: AccountId,
}

/// Provides default initialization for the contract.
/// Creates an empty contract with:
/// - No registered algorithm implementations
/// - Empty RSA public key components
impl Default for FaJwtGuard {
    fn default() -> Self {
        Self {
            implementations: HashMap::new(),
            n: vec![],
            e: vec![],
            owner: env::current_account_id(),
        }
    }
}

/// Implementation of the FaJwtGuard contract methods
#[near]
impl FaJwtGuard {

    #[init]
    pub fn init(owner: AccountId) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            implementations: HashMap::new(),
            n: vec![],
            e: vec![],
            owner: owner,
        }
    }

    /// Checks if the caller is the contract owner
    /// # Panics
    /// Panics if the caller is not the owner
    fn only_owner(&self) {
        assert!(env::signer_account_id() == self.owner, "Only the owner can call this function");
    }

    /// Gets the current owner of the contract
    /// # Returns
    /// * AccountId of the current owner
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Changes the owner of the contract
    /// # Arguments
    /// * `new_owner` - New owner account ID
    /// # Panics
    /// Panics if caller is not the owner
    pub fn change_owner(&mut self, new_owner: AccountId) {
        self.only_owner();
        self.owner = new_owner;
    }

    /// Sets the public key components for RSA verification
    /// 
    /// # Arguments
    /// * `n` - The modulus component of the RSA public key as a byte vector
    /// * `e` - The exponent component of the RSA public key as a byte vector
    pub fn set_public_key(&mut self, n: Vec<u8>, e: Vec<u8>) {
        self.only_owner();
        self.n = n;
        self.e = e;
    }

    /// Gets the current public key components
    ///
    /// # Returns
    /// A tuple containing:
    /// * The modulus component as a byte vector
    /// * The exponent component as a byte vector 
    pub fn get_public_key(&self) -> (Vec<u8>, Vec<u8>) {
        (self.n.clone(), self.e.clone())
    }

    /// Registers a new JWT algorithm implementation contract
    ///
    /// # Arguments
    /// * `name` - The name/type of the algorithm (e.g. "RS256")
    /// * `implementation` - The account ID of the implementation contract
    pub fn register_implementation(&mut self, name: String, implementation: AccountId) {
        self.only_owner();
        self.implementations.insert(name, implementation);
    }

    /// Removes a JWT algorithm implementation contract
    ///
    /// # Arguments
    /// * `name` - The name/type of the algorithm to remove
    pub fn unregister_implementation(&mut self, name: String) {
        self.only_owner();
        self.implementations.remove(&name);
    }

    /// Callback function that handles the result of signature verification
    ///
    /// # Arguments
    /// * `call_result` - The Result from the verification call
    ///
    /// # Returns
    /// A boolean indicating if verification succeeded
    #[private]
    pub fn on_verify_signature_callback(&mut self, user: String, permissions: String, #[callback_result] call_result: Result<bool, PromiseError>) -> (bool, String, String) {
        if call_result.is_err() {
            env::log_str("Signature verification failed");
            (false, String::new(), String::new())
        } else {
            let verification_result = call_result.unwrap();
            if verification_result {
                env::log_str("Guard verification successful");
            } else {
                env::log_str("Signature verification failed");
            }
            (verification_result, user, permissions)
        }
    }

    /// Gets all registered JWT algorithm implementations
    ///
    /// # Returns
    /// A reference to the HashMap containing algorithm names and their implementation contract account IDs
    pub fn get_implementations(&self) -> &HashMap<String, AccountId> {
        &self.implementations
    }

    /// Decodes a JWT string into its component parts
    ///
    /// # Arguments
    /// * `payload` - The full JWT string
    ///
    /// # Returns
    /// A Result containing a tuple of:
    /// * The decoded header as bytes
    /// * The encoded payload string
    /// * The signature string
    /// Or an error message if decoding fails
    fn decode_jwt(payload: &str) -> Result<(Vec<u8>, String, String), &'static str> {
        // Split JWT into parts
        let parts: Vec<&str> = payload.split('.').collect();
        if parts.len() != 3 {
            return Err("Invalid JWT format");
        }

        // Decode header (first part)
        let header = match base64::decode(parts[0]) {
            Ok(h) => h,
            Err(_) => return Err("Failed to decode header")
        };

        // Get payload (second part)
        let jwt_payload = parts[1].to_string();

        // Get signature (third part)
        let signature = parts[2].to_string();

        Ok((header, jwt_payload, signature))
    }

    /// Extracts the algorithm type from a JWT header
    ///
    /// # Arguments
    /// * `header` - The decoded JWT header as bytes
    ///
    /// # Returns
    /// A Result containing:
    /// * The algorithm name as a String
    /// * Or an error message if parsing fails
    fn get_jwt_algorithm(header: &[u8]) -> Result<String, &'static str> {
        // Parse header JSON
        let header_json: FaJwtHeaderClaims = match serde_json::from_slice(header) {
            Ok(j) => j,
            Err(_) => return Err("Failed to parse header JSON")
        };

        // Get algorithm
        Ok(header_json.alg.to_string())
    }

    fn retrieve_jwt_claims(payload: &str) -> (String, String) {
        // Decode base64url payload
        let decoded_payload = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(payload.as_bytes()) {
            Ok(bytes) => String::from_utf8(bytes).unwrap_or_else(|_| env::panic_str("Invalid JWT payload encoding")),
            Err(_) => env::panic_str("Invalid JWT payload encoding"),
        };

        // Parse JSON claims
        let claims: FaJwtCustomClaims = serde_json::from_str(&decoded_payload)
            .unwrap_or_else(|_| env::panic_str("Invalid JWT claims format"));

        (claims.fap, claims.sub)
    }

    /// Verifies a JWT signature using the appropriate algorithm implementation
    ///
    /// # Arguments
    /// * `jwt` - The full JWT string to verify
    ///
    /// # Returns
    /// A Promise that will resolve to a boolean indicating if verification succeeded
    pub fn verify(&self, jwt: String) -> Promise {
        // Decode JWT
        let (header, payload, _) = match Self::decode_jwt(&jwt) {
            Ok((h, j, s)) => (h, j, s),
            Err(_) => env::panic(b"Invalid JWT format")
        };

        // Get permissions and user from JWT claims
        let (permissions, user) = Self::retrieve_jwt_claims(&payload);

        // Get algorithm
        let alg = match Self::get_jwt_algorithm(&header) {
            Ok(a) => a,
            Err(_) => env::panic(b"Invalid JWT format")
        };

        // Get implementation
        let implementation = match self.get_implementations().get(&alg) {
            Some(i) => i,
            None => env::panic(b"Invalid JWT format")
        };

        // Verify signature
        jwt_algorithm::ext(implementation.clone())
        .verify_signature(self.n.clone(), self.e.clone(), jwt)
        .then(Self::ext(env::current_account_id())
            .on_verify_signature_callback(user, permissions)
        )
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_public_key_empty() {
        let contract = FaJwtGuard::default();
        let (n, e) = contract.get_public_key();
        assert_eq!(n, Vec::<u8>::new());
        assert_eq!(e, Vec::<u8>::new());
    }

    #[test]
    fn test_get_public_key_not_empty() {
        let contract = FaJwtGuard { implementations: HashMap::new(), n: vec![1, 2, 3], e: vec![4, 5, 6], owner: env::current_account_id() };
        let (n, e) = contract.get_public_key();
        assert_eq!(n, vec![1, 2, 3]);
        assert_eq!(e, vec![4, 5, 6]);
    }

    #[test]
    fn test_get_implementations_empty() {
        let contract = FaJwtGuard::default();
        let implementations = contract.get_implementations();
        assert_eq!(implementations.len(), 0);
    }

    #[test]
    fn test_get_implementations_not_empty() {
        let contract = FaJwtGuard { implementations: HashMap::from([("rsa256".to_string(), "implementation".parse().unwrap())]), n: vec![], e: vec![], owner: env::current_account_id() };
        let implementations = contract.get_implementations();
        assert_eq!(implementations.len(), 1);
    }

    #[test]
    fn owner() {
        let contract = FaJwtGuard { implementations: HashMap::new(), n: vec![], e: vec![], owner: env::current_account_id() };
        assert_eq!(contract.owner(), env::current_account_id());
    }
}
