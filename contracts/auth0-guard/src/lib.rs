// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, env};
use near_sdk::serde_json;
use serde::{Deserialize, Serialize};
use crypto_bigint::{BoxedUint, Odd};

use crate::jwt::codec::{decode_jwt, decode_base64_bytes};
use crate::rsa::rs256::verify_signature_from_components;

pub mod rsa;
pub mod jwt;

const PRECISION: u32 = 2048;

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
    pub fatxn: Vec<u8>,

}

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JSON Web Tokens (JWTs) that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
/// The contract stores the RSA public key components (modulus and exponent) used for verification.
#[near(contract_state)]
pub struct Auth0Guard {
    n_component: Vec<u8>,
    e_component: Vec<u8>,
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for Auth0Guard{
    fn default() -> Self {
        Self {
            n_component: vec![],
            e_component: vec![],
            owner: env::current_account_id(),
        }
    }
}

#[near]
impl Auth0Guard {

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

        assert_eq!(n.len(), 256, "modulus must be 2048 bits");
        let n_int = BoxedUint::from_be_slice(&n, PRECISION).unwrap();
        assert!(Odd::new(n_int).is_some().unwrap_u8() == 1, "modulus must be odd");

        let allowed_e: &[&[u8]] = &[&[0x01, 0x00, 0x01]];
        assert!(allowed_e.iter().any(|v| *v == e.as_slice()), "invalid exponent");
        
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
        let data_to_verify = format!("{header}.{payload}");

        let signature_bytes = decode_base64_bytes(signature);

        // Verify the signature
        verify_signature_from_components(
            data_to_verify,
            signature_bytes,
            self.n_component.clone(),
            self.e_component.clone(),
        )
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
        let contract = Auth0Guard { 
            n_component: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJmYXR4biI6WzE4LDAsMCwwLDEwMiw5Nyw0NSwxMDMsMTE3LDEwNSwxMDgsMTA4LDEwMSwxMDksNDYsMTE2LDEwMSwxMTUsMTE2LDExMCwxMDEsMTE2LDEsMzksMTIwLDIsNTAsNDIsMjQ3LDI0MywyMjMsMTUyLDk3LDI1MSwyOCwxNTMsMzgsMTU0LDEzMiwxODQsMTIzLDE1MiwxNTAsMjQ3LDIxNiw4Nyw1Myw3Niw0MiwxMjcsMTksMTI4LDgsMTgyLDIwOSwyNTEsMjcsMTgwLDIwLDM3LDE4NSwyNDcsMzUsNiw3MSwzMSw5NiwxMTAsNjYsMTIxLDEwNSwyMjgsMjUsMjUwLDIwNiwxODMsMTkxLDM2LDEwOSw3NSwxMDUsOTcsMjksNDAsMTQyLDgsMjQ0LDkyLDQxLDE4NiwxMjYsODYsMTExLDAsMCwyMCwwLDAsMCw5OCwxMTEsMTE1LDEwNSwxMTUsMTE2LDEwNCwxMDEsMTEwLDEwMSw5NywxMTQsNDYsMTE2LDEwMSwxMTUsMTE2LDExMCwxMDEsMTE2LDUyLDIxLDgzLDc1LDIyMCwxNzAsMTA0LDE3OSwxMzYsMjQ0LDE2OCwxMTgsMjUsOTIsMjI0LDY4LDEzMSwxNTIsMTUyLDQxLDI0NSwxOTMsMjI5LDE4Miw4LDEzNiw4NiwyMzcsMTQxLDIxNywxNTcsMTU1LDEsMCwwLDAsMywxMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF0sImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA1NDQ2OTI1MjM1NjMyNzc3Mzk3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDY2OTczODYsImV4cCI6MTc0Njc4Mzc4Niwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0.XChULVjx06hAGdBND54qFWr9KVdP95GXLc4Y8KzC9Fpj4Ky6E76ijbjE9ATVpSylKKMHrpVxjQHMoszyPbkHA759mf9x3gr5mOEkUy2WR8N35SYTZkbB77l8pA5o_zxOS9SKewBrGyZWpij0OyiM-Eqom3nwer3Aw3UPFyVB2ucpQkW-eJVrlNpKB80xhr1lCRBiHvPEnNH2Mk5Ok3x-uRzPTRq__hMjuY3F_udF4cEbeJGoWA2QGr1gTeUMKJyGvSThEk2xxq5xagXDA6FPq5DHi1Q9GxUlA3pPeb7zhNseUoGm1AdCTlqqGwgakUkuWj7I5miBjNu6qd-fQfkGXQ".to_string(), vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
        assert_eq!(result, (true, "google-oauth2|105446925235632777397".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_pk() {
         let contract = Auth0Guard { 
            n_component: vec![182, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAQ".to_string(), vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
        assert_eq!(result, (false, "".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_signature() {
        let contract = Auth0Guard { 
            n_component: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAY".to_string(), vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
        assert_eq!(result, (false, "".to_string()));
    }

    #[test]
    fn test_verify_signature_invalid_payload() {
        let contract = Auth0Guard { 
            n_component: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
            e_component: vec![1, 0, 1],
            owner: env::current_account_id(),
        };
        let result = contract.verify("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJmYXR4biI6WzE4LDAsMCwwLDEwMiw5Nyw0NSwxMDMsMTE3LDEwNSwxMDgsMTA4LDEwMSwxMDksNDYsMTE2LDEwMSwxMTUsMTE2LDExMCwxMDEsMTE2LDEsMzksMTIwLDIsNTAsNDIsMjQ3LDI0MywyMjMsMTUyLDk3LDI1MSwyOCwxNTMsMzgsMTU0LDEzMiwxODQsMTIzLDE1MiwxNTAsMjQ3LDIxNiw4Nyw1Myw3Niw0MiwxMjcsMTksMTI4LDgsMTgyLDIwOSwyNTEsMjcsMTgwLDIwMzcsMTg1LDI0NywzNSw2LDcxLDMxLDk2LDExMCw2NiwxMjEsMTA1LDIyOCwyNSwyNTAyMDYsMTgzLDE5MSwzNiwxMDksNzUsMTA1LDk3LDI5LDQwLDE0Miw4LDI0NCw5Miw0MSwxODYsMTI2LDg2LDExMSwwLDAsMjAsMCwwLDAsOTgsMTEyLDExNSwxMDUsMTE1LDExNiwxMDQsMTAxLDExMCwxMDEsOTcsMTE0LDQ2LDExNiwxMDEsMTE1LDExNiwxMTAxMDEsMTE2LDUyLDIxLDgzLDc1LDIyMCwxNzAsMTA0LDE3OSwxMzYsMjQ0LDE2OCwxMTgsMjUsOTIsMjI0LDY4LDEzMSwxNTIsMTUyLDQxLDI0NSwxOTMsMjI5LDE4Miw4LDEzNiw4NiwyMzcsMTQxLDIxNywxNTcsMTU1LDEsMCwwLDAsMywxMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMF0sImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA1NDQ2OTI1MjM1NjMyNzc3Mzk3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDY2OTczODYsImV4cCI6MTc0Njc4Mzc4Niwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0.XChULVjx06hAGdBND54qFWr9KVdP95GXLc4Y8KzC9Fpj4Ky6E76ijbjE9ATVpSylKKMHrpVxjQHMoszyPbkHA759mf9x3gr5mOEkUy2WR8N35SYTZkbB77l8pA5o_zxOS9SKewBrGyZWpij0OyiM-Eqom3nwer3Aw3UPFyVB2ucpQkW-eJVrlNpKB80xhr1lCRBiHvPEnNH2Mk5Ok3x-uRzPTRq__hMjuY3F_udF4cEbeJGoWA2QGr1gTeUMKJyGvSThEk2xxq5xagXDA6FPq5DHi1Q9GxUlA3pPeb7zhNseUoGm1AdCTlqqGwgakUkuWj7I5miBjNu6qd-fQfkGXQ".to_string(), vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
        assert_eq!(result, (false, "".to_string()));
    }
}
