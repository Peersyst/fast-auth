// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, env};
use near_sdk::serde_json;
use serde::{Deserialize, Serialize};

use crate::jwt::codec::{decode_jwt, decode_base64_bytes};
use crate::rsa::rs256::verify_signature_from_components;

pub mod rsa;
pub mod jwt;

/// Custom claims structure for FastAuth JWT tokens
/// 
/// This is a temporary structure to be replaced with the actual FastAuth JWT claims
/// 
/// # Fields
/// * `sub` - The subject identifier claim that uniquely identifies the user
#[derive(Serialize, Deserialize)]
pub struct CustomClaims {
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
    /// The FastAuth claim that specifies the signed payload
    pub fatxn: Vec<u8>,

    // NOTE: Add here your custom claims (if needed)
}

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JSON Web Tokens (JWTs) that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
/// The contract stores the RSA public key components (modulus and exponent) used for verification.
#[near(contract_state)]
pub struct JwtRS256Guard {
    n_component: Vec<u8>,
    e_component: Vec<u8>,
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for JwtRS256Guard{
    fn default() -> Self {
        Self {
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        }
    }
}

#[near]
impl JwtRS256Guard {

    /// Initializes the contract with an owner and RSA public key components
    /// 
    /// # Arguments
    /// * `owner` - The account that will have administrative privileges
    /// * `n_component` - The RSA public key modulus as a byte vector
    /// * `e_component` - The RSA public key exponent as a byte vector
    /// 
    /// # Panics
    /// Panics if the contract is already initialized
    #[private]
    #[init]
    pub fn init(owner: AccountId, n_component: Vec<u8>, e_component: Vec<u8>) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            n_component,
            e_component,
            owner,
        }
    }

   /// Checks if the caller is the contract owner
   /// 
   /// This is an internal method used to restrict access to administrative functions
   /// 
   /// # Panics
   /// Panics if the caller's account ID does not match the stored owner account ID
    fn only_owner(&self) {
        assert!(env::signer_account_id() == self.owner, "Only the owner can call this function");
    }

    /// Gets the current owner of the contract
    /// 
    /// # Returns
    /// * `AccountId` - The account ID of the current contract owner
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Changes the owner of the contract to a new account
    /// 
    /// # Arguments
    /// * `new_owner` - The account ID that will become the new owner
    /// 
    /// # Panics
    /// Panics if the caller is not the current owner
    pub fn change_owner(&mut self, new_owner: AccountId) {
        self.only_owner();
        self.owner = new_owner;
    }

    /// Sets new RSA public key components for signature verification
    /// 
    /// # Arguments
    /// * `n` - The modulus component of the RSA public key as a byte vector
    /// * `e` - The exponent component of the RSA public key as a byte vector
    /// 
    /// # Panics
    /// Panics if the caller is not the contract owner
    pub fn set_public_key(&mut self, n: Vec<u8>, e: Vec<u8>) {
        self.only_owner();
        self.n_component = n;
        self.e_component = e;
    }

    /// Gets the current RSA public key components
    ///
    /// # Returns
    /// A tuple containing:
    /// * `Vec<u8>` - The modulus component as a byte vector
    /// * `Vec<u8>` - The exponent component as a byte vector
    pub fn get_public_key(&self) -> (Vec<u8>, Vec<u8>) {
        (self.n_component.clone(), self.e_component.clone())
    }

    /// Internal function to verify a JWT token and return its payload
    /// 
    /// # Arguments
    /// * `jwt` - Complete JWT token string in format header.payload.signature
    ///
    /// # Returns
    /// * `(bool, Vec<u8>)` - Tuple containing:
    ///   - Boolean indicating if the token is valid
    ///   - The decoded payload bytes if valid, empty vector if invalid
    fn verify_token(&self, jwt: String) -> bool {
        let (header, payload, signature) = decode_jwt(jwt);

        // Create the data to be verified (header.payload)
        let data_to_verify = format!("{}.{}", header, payload);
        
        let signature_bytes = decode_base64_bytes(signature);

        // Verify the signature
        let is_valid = verify_signature_from_components(
            data_to_verify,
            signature_bytes,
            self.n_component.clone(),
            self.e_component.clone(),
        );

        is_valid
    }


    /// Verifies custom claims in the JWT payload
    /// # Arguments
    /// * `jwt_payload` - Decoded JWT payload as bytes
    /// * `sign_payload` - Payload to verify against the JWT fatxn claim
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    fn verify_custom_claims(&self, jwt_payload: Vec<u8>, sign_payload: Vec<u8>) -> (bool, String) {
        // Parse the payload into CustomClaims
        let claims: CustomClaims = match serde_json::from_slice(&jwt_payload) {
            Ok(claims) => claims,
            Err(error) => return (false, error.to_string()),
        };

        // Verify your custom claim here

        // Compare fatxn with sign_payload
        if claims.fatxn != sign_payload {
            return (false, "Transaction payload mismatch".to_string());
        }

        // NOTE: Extend here your verification logic (if needed)

        // Return the sub and fatxn fields
        (true, claims.sub)
    }

    /// Verifies a JWT token and its custom claims
    /// 
    /// # Arguments
    /// * `jwt` - The JWT token to verify as a string
    /// * `sign_payload` - The payload to verify against the JWT fatxn claim
    /// 
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    pub fn verify(&self, jwt: String, sign_payload: Vec<u8>) -> (bool, String) {
        let valid = self.verify_token(jwt.clone());

        if !valid {
            (false, "".to_string())
        } else {
            let (_, payload, _) = decode_jwt(jwt);
            let payload_bytes = decode_base64_bytes(payload);

            self.verify_custom_claims(payload_bytes, sign_payload)
        }
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
    fn test_verify_signature() {
        let contract = JwtRS256Guard {
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        };
        let result = contract.verify("".to_string(), vec![]);
        assert_eq!(result, (true, "".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_pk() {
        let contract = JwtRS256Guard {
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        };
        let result = contract.verify("".to_string(), vec![]);
        assert_eq!(result, (false, "".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_signature() {
        let contract = JwtRS256Guard { 
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        };
        let result = contract.verify("".to_string(), vec![]);
        assert_eq!(result, (false, "".to_string()));
    }
}
