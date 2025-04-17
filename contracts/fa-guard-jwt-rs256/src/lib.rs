// Find all our documentation at https://docs.near.org
use near_sdk::{near, base64, AccountId, env};
use crypto_bigint::modular::BoxedMontyParams;
use crypto_bigint::{NonZero, BoxedUint, Odd};
use near_sdk::base64::Engine;
use sha2::{Sha256, Digest};
use near_sdk::serde_json;
use crate::jwt::FaJwtCustomClaims;

use crate::rsa::key::RsaPublicKey;
use crypto_bigint::subtle::ConstantTimeEq;
use crate::rsa::key::PublicKeyParts;

pub mod rsa;
pub mod jwt;

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JSON Web Tokens (JWTs) that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
/// The contract stores the RSA public key components (modulus and exponent) used for verification.
#[near(contract_state)]
pub struct FaJwtGuardRs256 {
    n_component: Vec<u8>,
    e_component: Vec<u8>,
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for FaJwtGuardRs256 {
    fn default() -> Self {
        Self {
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        }
    }
}

/// ASN.1 DER encoded prefix for SHA-256 algorithm identifier
/// This prefix is prepended to the message hash during RSA signature verification
/// as specified in PKCS#1 v1.5
const PREFIX: &[u8] = &[
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
];

/// Bit precision used for RSA operations (2048-bit key)
/// This defines the size of the RSA key used for signature verification
const PRECISION: u32 = 2048;

#[near]
impl FaJwtGuardRs256 {

    /// Initializes the contract with an owner and RSA public key components
    /// 
    /// # Arguments
    /// * `owner` - The account that will have administrative privileges
    /// * `n_component` - The RSA public key modulus as a byte vector
    /// * `e_component` - The RSA public key exponent as a byte vector
    /// 
    /// # Panics
    /// Panics if the contract is already initialized
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

    /// Verifies a JWT token signature using RS256 algorithm
    ///
    /// # Arguments
    /// * `token` - Complete JWT token string in format header.payload.signature
    ///
    /// # Returns
    /// * `bool` - True if signature is valid, false otherwise
    ///
    /// # Verification Process
    /// 1. Splits JWT into header, payload and signature components
    /// 2. Decodes the base64url-encoded signature
    /// 3. Creates SHA-256 hash of header.payload
    /// 4. Performs RSA signature verification with PKCS#1 v1.5 padding:
    ///    - Applies modular exponentiation to recover padded hash
    ///    - Verifies PKCS#1 v1.5 padding structure
    ///    - Compares recovered hash with computed hash
    pub fn verify(&self, jwt: String) -> (bool, String, String) {
        // Split the JWT token into its parts
        let parts: Vec<&str> = jwt.split('.').collect();
        if parts.len() != 3 {
            return (false, String::new(), String::new());
        }

        // Get the header and payload
        let header = parts[0];
        let payload = parts[1];
        let signature_b64 = parts[2];

        // Decode the signature from base64url
        let signature_bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(signature_b64.as_bytes()) {
            Ok(bytes) => bytes,
            Err(_) => return (false, String::new(), String::new()),
        };

        // Create the data to be verified (header.payload)
        let data_to_verify = format!("{}.{}", header, payload);

        // Hash the data using SHA256
        let mut hasher = Sha256::new();
        hasher.update(data_to_verify.as_bytes());
        let hashed = hasher.finalize().to_vec();

        // Convert signature and key components to big integers
        let signature = BoxedUint::from_be_slice(&signature_bytes, PRECISION).expect("Failed to create signature BoxedUint");
        let n = BoxedUint::from_be_slice(&self.n_component, PRECISION).expect("Failed to create n BoxedUint");
        let e = BoxedUint::from_be_slice(&self.e_component, PRECISION).expect("Failed to create e BoxedUint");

        // Create RSA public key
        let pub_key = &RsaPublicKey {
            n: NonZero::new(n.clone()).expect("Non-zero value required"),
            e,
            n_params: BoxedMontyParams::new_vartime(Odd::new(n.clone()).expect("Odd value required")),
        };

        // Check signature bounds
        if signature >= *pub_key.n.as_ref() || signature.bits_precision() != pub_key.n.bits_precision() {
            return (false, String::new(), String::new());
        }

        // Perform RSA encryption (signature verification)
        let modulus = pub_key.n_params.modulus().as_nz_ref();
        let bits_precision = modulus.bits_precision();
        
        // Initialize result to 1
        let mut result = BoxedUint::one_with_precision(bits_precision);
        let mut base = signature.clone();
        
        // Square-and-multiply algorithm for modular exponentiation
        for i in 0..pub_key.e.bits() {
            if pub_key.e.bit(i).into() {
                result = result.mul(&base).rem_vartime(modulus);
            }
            base = base.mul(&base).rem_vartime(modulus);
        }

        // Convert result to padded bytes
        let leading_zeros = result.leading_zeros() as usize / 8;
        let em = {
            let input = &result.to_be_bytes()[leading_zeros..];
            let padded_len = pub_key.size();
            if input.len() > padded_len {
                return (false, String::new(), String::new());
            }
            let mut out = vec![0u8; padded_len];
            out[padded_len - input.len()..].copy_from_slice(input);
            out
        };

        // Verify PKCS#1 v1.5 padding
        let hash_len = hashed.len();
        let t_len = PREFIX.len() + hashed.len();
        let k = pub_key.size();
        if k < t_len + 11 {
            return (false, String::new(), String::new());
        }

        // Check padding structure: EM = 0x00 || 0x01 || PS || 0x00 || T
        let mut ok = em[0].ct_eq(&0u8);
        ok &= em[1].ct_eq(&1u8);
        ok &= em[k - hash_len..k].ct_eq(&hashed);
        ok &= em[k - t_len..k - hash_len].ct_eq(&PREFIX);
        ok &= em[k - t_len - 1].ct_eq(&0u8);

        // Verify PS (padding string) contains all 0xFF bytes
        for el in em.iter().skip(2).take(k - t_len - 3) {
            ok &= el.ct_eq(&0xff)
        }

        if ok.unwrap_u8() == 1 {
            // Decode the payload from base64url
            let payload_bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(payload.as_bytes()) {
                Ok(bytes) => bytes,
                Err(_) => return (false, String::new(), String::new()),
            };

            // Parse the payload into FaJwtCustomClaims
            let claims: FaJwtCustomClaims = match serde_json::from_slice(&payload_bytes) {
                Ok(claims) => claims,
                Err(_) => return (false, String::new(), String::new()),
            };

            // Return the sub and fap fields
            (true, claims.sub, claims.fap)
        } else {
            (false, String::new(), String::new())
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
        let contract = FaJwtGuardRs256 { 
            n_component: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJmYXAiOiJwZXJtaXNzaW9ucyIsImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTE1MjMxMDAyNzE0MDY3ODQ3MDI3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDQzNjU2NzAsImV4cCI6MTc0NDQ1MjA3MCwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0.bUbBnZxqfugUNv64wYt6kVmKuySbFrVO_Xlj8YrjsZk_N9fZw0-wCXfFkxVKmQUfbqqbgczqhHwPZVrC8_9COq21qwBtZCxMQOjLSRZhM0Y8CmDpugY8f5bFExoHeeXgvXWh0DCKmtU90PNKr4OxEqD25V71s8X2uiAqwClcxwIPYiIYTukK_MR7tuf9WR4ixc6eV-av5ui2XenQn_fIWITFfJfc5m_0WO3X5jWGD4JtO9dYFSJGMnYH3r5A6myHkj9vPNusTU92KXmMwhDi6U-CxYzWpY_pAfnV1Aj9BQE1Oo15ymrpaKMkqhzjMOehKS3MTomJin6pX1ujmis9TA".to_string());
        assert_eq!(result, (true, "google-oauth2|115231002714067847027".to_string(), "permissions".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_pk() {
        let contract = FaJwtGuardRs256 { 
            n_component: vec![182, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAQ".to_string());
        assert_eq!(result, (false, String::new(), String::new()));
    }

    #[test]
    fn test_verify_signature_invalid_signature() {
        let contract = FaJwtGuardRs256 { 
            n_component: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAY".to_string());
        assert_eq!(result, (false, String::new(), String::new()));
    }
}
