use near_sdk::{env, AccountId, serde_json, near};
use serde::{Deserialize, Serialize};
use crate::jwt::codec::{decode_jwt, decode_base64_bytes};
use crate::rsa::rs256::verify_signature_from_components;
const MAX_JWT_SIZE: u128 = 7168;

#[derive(Serialize, Deserialize)]
pub struct Claims {
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
    pub iss: String,
    pub exp: u64,
    pub nbf: Option<u64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct JwtPublicKey {
    pub n: Vec<u8>,
    pub e: Vec<u8>,
}

pub trait JwtGuard {
    /// Gets the current RSA public key components
    ///
    /// # Returns
    /// A tuple containing:
    /// * `Vec<u8>` - The modulus component as a byte vector
    /// * `Vec<u8>` - The exponent component as a byte vector
    fn get_public_keys(&self) -> Vec<JwtPublicKey>;

    /// Gets the current issuer of the contract
    ///
    /// # Returns
    /// * `String` - The issuer of the contract
    fn get_issuer(&self) -> String;

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
        let data_to_verify = format!("{header}.{payload}");

        let signature_bytes = decode_base64_bytes(signature);

        let public_keys = self.get_public_keys();
        
        public_keys.into_iter().any(|public_key| 
            verify_signature_from_components(
                data_to_verify.clone(),
                signature_bytes.clone(),
                public_key.n.clone(),
                public_key.e.clone(),
            )
        )
    }


    fn verify_custom_claims(&self, jwt_payload: Vec<u8>, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String);

    /// Verifies custom claims in the JWT payload
    /// # Arguments
    /// * `jwt_payload` - Decoded JWT payload as bytes
    /// * `sign_payload` - Payload to verify against the JWT fatxn claim
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing either the subject claim or error message
    fn verify_claims(&self, jwt_payload: Vec<u8>, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String) {
        // Parse the payload into Claims
        let claims: Claims = match serde_json::from_slice(&jwt_payload) {
            Ok(claims) => claims,
            Err(error) => return (false, error.to_string()),
        };

        let (verified, reason) = self.verify_custom_claims(jwt_payload, sign_payload, predecessor);
        if !verified {
            return (verified, reason)
        }

        let now = env::block_timestamp_ms() / 1000;
        if claims.exp <= now {
            return (false, "Token expired".to_string());
        }
        if claims.nbf.unwrap_or(0) > now {
            return (false, "Token not yet valid".to_string());
        }
        if claims.iss != self.get_issuer() {
            return (false, "Invalid issuer".to_string());
        }

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
    fn internal_verify(&self, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String) {
        // Check JWT size limit (7KB = 7168 bytes)
        if jwt.len() > MAX_JWT_SIZE as usize {
            return (false, "JWT token exceeds maximum size limit".to_string());
        }
        let valid = self.verify_token(jwt.clone());

        if !valid {
            (false, "".to_string())
        } else {
            let (_, payload, _) = decode_jwt(jwt);
            let payload_bytes = decode_base64_bytes(payload);

            self.verify_claims(payload_bytes, sign_payload, predecessor)
        }
    }
}