// Find all our documentation at https://docs.near.org
use near_sdk::{log, near};

// Define the contract structure
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

const PREFIX: &[u8] = &[
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
];
const PRECISION: u64 = 2048;

// Implement the contract structure
#[near]
impl FaJwtGuardRs256 {
    pub fn verify_signature(&self, n: Vec<u8>, e: Vec<u8>, token: String) -> bool {
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
        let signature_bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(signature_b64) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };

        // Create the data to be verified (header.payload)
        let data_to_verify = format!("{}.{}", header, payload);

        // Hash the data using SHA256
        let mut hasher = sha2::Sha256::new();
        hasher.update(data_to_verify.as_bytes());
        let hashed = hasher.finalize().to_vec();

        let signature = BoxedUint::from_be_slice(&signature_bytes, PRECISION).expect("Failed to create signature BoxedUint");
        let n = BoxedUint::from_be_slice(&self.n, PRECISION).expect("Failed to create n BoxedUint");
        let e = BoxedUint::from_be_slice(&self.e, PRECISION).expect("Failed to create e BoxedUint");

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

        // Inlined rsa_encrypt function
        let modulus = pub_key.n_params.modulus().as_nz_ref();
        let bits_precision = modulus.bits_precision();
        
        // Initialize result to 1
        let mut result = BoxedUint::one_with_precision(bits_precision);
        let mut base = signature.clone();
        
        // Square-and-multiply algorithm
        for i in 0..pub_key.e.bits() {
            if pub_key.e.bit(i).into() {
                result = result.mul(&base).rem_vartime(modulus);
            }
            base = base.mul(&base).rem_vartime(modulus);
        }

        // Inlined uint_to_be_pad function
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

        // Inlined pkcs1v15_sign_unpad function
        let hash_len = hashed.len();
        let t_len = PREFIX.len() + hashed.len();
        let k = pub_key.size();
        if k < t_len + 11 {
            return false;
        }

        // EM = 0x00 || 0x01 || PS || 0x00 || T
        let mut ok = em[0].ct_eq(&0u8);
        ok &= em[1].ct_eq(&1u8);
        ok &= em[k - hash_len..k].ct_eq(&hashed);
        ok &= em[k - t_len..k - hash_len].ct_eq(&PREFIX);
        ok &= em[k - t_len - 1].ct_eq(&0u8);

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
        let result = contract.verify_signature(vec![], vec![], "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ".to_string());
        assert_eq!(result, false);
    }
}
