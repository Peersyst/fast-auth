// Find all our documentation at https://docs.near.org
use near_sdk::{near, base64};
use crypto_bigint::modular::BoxedMontyParams;
use crypto_bigint::{NonZero, BoxedUint, Odd};
use near_sdk::base64::Engine;
use sha2::{Sha256, Digest};

use crate::rsa::key::RsaPublicKey;
use crypto_bigint::subtle::ConstantTimeEq;
use crate::rsa::key::PublicKeyParts;

pub mod rsa;

/// A NEAR contract that verifies JWT tokens signed with RS256 algorithm
/// 
/// This contract provides functionality to verify JWT tokens that have been signed using
/// RSA with SHA-256 (RS256). It implements the PKCS#1 v1.5 padding scheme for signature verification.
#[near(contract_state)]
pub struct FaJwtGuardRs256 {
}

// Define the default, which automatically initializes the contract
impl Default for FaJwtGuardRs256 {
    fn default() -> Self {
        Self {
        }
    }
}

/// ASN.1 DER encoded prefix for SHA-256 algorithm identifier
const PREFIX: &[u8] = &[
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
];

/// Bit precision used for RSA operations (2048-bit key)
const PRECISION: u32 = 2048;

#[near]
impl FaJwtGuardRs256 {
    /// Verifies a JWT token signature using RS256
    ///
    /// # Arguments
    ///
    /// * `n_arg` - RSA public key modulus as bytes
    /// * `e_arg` - RSA public key exponent as bytes
    /// * `token` - Complete JWT token string in format header.payload.signature
    ///
    /// # Returns
    ///
    /// * `bool` - True if signature is valid, false otherwise
    ///
    /// # Verification Process
    ///
    /// 1. Splits JWT into header, payload and signature parts
    /// 2. Decodes base64url signature
    /// 3. Creates hash of header.payload using SHA-256
    /// 4. Performs RSA signature verification with PKCS#1 v1.5 padding
    pub fn verify_signature(&self, n_arg: Vec<u8>, e_arg: Vec<u8>, token: String) -> bool {
        // Split the JWT token into its parts
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return false;
        }

        // Get the header and payload
        let header = parts[0];
        let payload = parts[1];
        let signature_b64 = parts[2];

        // Decode the signature from base64url
        let signature_bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(signature_b64.as_bytes()) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };

        // Create the data to be verified (header.payload)
        let data_to_verify = format!("{}.{}", header, payload);

        // Hash the data using SHA256
        let mut hasher = Sha256::new();
        hasher.update(data_to_verify.as_bytes());
        let hashed = hasher.finalize().to_vec();

        // Convert signature and key components to big integers
        let signature = BoxedUint::from_be_slice(&signature_bytes, PRECISION).expect("Failed to create signature BoxedUint");
        let n = BoxedUint::from_be_slice(&n_arg, PRECISION).expect("Failed to create n BoxedUint");
        let e = BoxedUint::from_be_slice(&e_arg, PRECISION).expect("Failed to create e BoxedUint");

        // Create RSA public key
        let pub_key = &RsaPublicKey {
            n: NonZero::new(n.clone()).expect("Non-zero value required"),
            e,
            n_params: BoxedMontyParams::new_vartime(Odd::new(n.clone()).expect("Odd value required")),
        };

        // Check signature bounds
        if signature >= *pub_key.n.as_ref() || signature.bits_precision() != pub_key.n.bits_precision() {
            return false;
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
                return false;
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
            return false;
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

        ok.unwrap_u8() == 1
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
        let contract = FaJwtGuardRs256::default();
        let result = contract.verify_signature(vec![
            183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215
        ], vec![
            1, 0, 1
        ], "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAQ".to_string());
        assert_eq!(result, true);
    }

    #[test]
    fn test_verify_signature_invalid_pk() {
        let contract = FaJwtGuardRs256::default();
        let result = contract.verify_signature(vec![
            182, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215
        ], vec![
            1, 0, 1
        ], "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAQ".to_string());
        assert_eq!(result, false);
    }

    #[test]
    fn test_verify_signature_invalid_signature() {
        let contract = FaJwtGuardRs256::default();
        let result = contract.verify_signature(vec![
            183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215
        ], vec![
            1, 0, 1
        ], "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAY".to_string());
        assert_eq!(result, false);
    }
}
