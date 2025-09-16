use crypto_bigint::{NonZero, BoxedUint, Odd};
use crypto_bigint::modular::BoxedMontyParams;
use crypto_bigint::subtle::ConstantTimeEq;
use sha2::{Sha256, Digest};
use crate::rsa::key::{RsaPublicKey, PublicKeyParts};

/// ASN.1 DER encoded prefix for SHA-256 algorithm identifier
/// This prefix is prepended to the message hash during RSA signature verification
/// as specified in PKCS#1 v1.5
const PREFIX: &[u8] = &[
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
];

/// Bit precision used for RSA operations (2048-bit key)
/// This defines the size of the RSA key used for signature verification
const PRECISION: u32 = 2048;

/// Verifies an RSA-SHA256 (RS256) signature using the provided signature and public key components
/// 
/// # Arguments
/// * `payload` - The data that was signed, as a byte vector
/// * `signature` - The RSA signature to verify, as a byte vector
/// * `n` - The RSA public key modulus component, as a byte vector
/// * `e` - The RSA public key exponent component, as a byte vector
///
/// # Returns
/// * `bool` - True if the signature is valid, false otherwise
///
/// # Description
/// This function implements RSA signature verification using PKCS#1 v1.5 padding scheme.
/// It first hashes the payload using SHA-256, then verifies the signature using the 
/// provided RSA public key components through modular exponentiation.
#[allow(clippy::needless_borrow)]
pub fn verify_signature_from_components(payload: String, signature_bytes: Vec<u8>, n: Vec<u8>, e: Vec<u8>) -> bool {
    // Hash the data using SHA256
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    let hashed = hasher.finalize().to_vec();

    // Convert signature and key components to big integers
    let signature = BoxedUint::from_be_slice(&signature_bytes, PRECISION).expect("Failed to create signature BoxedUint");
    let n = BoxedUint::from_be_slice(&n, PRECISION).expect("Failed to create n BoxedUint");
    let e = BoxedUint::from_be_slice(&e, PRECISION).expect("Failed to create e BoxedUint");

    // Create RSA public key
    let pub_key = &RsaPublicKey {
        n: NonZero::new(n.clone()).expect("Non-zero value required"),
        e,
        n_params: BoxedMontyParams::new_vartime(Odd::new(n.clone()).expect("Odd value required")),
    };

    // Initialize verification flags - all checks must pass
    let mut verification_passed = true;

    // Check signature bounds
    let signature_bounds_valid = signature < *pub_key.n.as_ref() && signature.bits_precision() == pub_key.n.bits_precision();
    verification_passed &= signature_bounds_valid;

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
        
        // Check input length - don't fail fast, just track the result
        let input_length_valid = input.len() <= padded_len;
        verification_passed &= input_length_valid;
        
        if input_length_valid {
            let mut out = vec![0u8; padded_len];
            out[padded_len - input.len()..].copy_from_slice(input);
            out
        } else {
            // Create dummy padding for consistent verification flow
            vec![0u8; padded_len]
        }
    };

    // Verify PKCS#1 v1.5 padding
    let hash_len = hashed.len();
    let t_len = PREFIX.len() + hashed.len();
    let k = pub_key.size();
    
    // Check padding length requirement
    let padding_length_valid = k >= t_len + 11;
    verification_passed &= padding_length_valid;

    // Check padding structure: EM = 0x00 || 0x01 || PS || 0x00 || T
    let mut padding_structure_valid = em[0].ct_eq(&0u8);
    padding_structure_valid &= em[1].ct_eq(&1u8);
    padding_structure_valid &= em[k - hash_len..k].ct_eq(&hashed);
    padding_structure_valid &= em[k - t_len..k - hash_len].ct_eq(&PREFIX);
    padding_structure_valid &= em[k - t_len - 1].ct_eq(&0u8);

    // Verify PS (padding string) contains all 0xFF bytes
    for el in em.iter().skip(2).take(k - t_len - 3) {
        padding_structure_valid &= el.ct_eq(&0xff)
    }

    // Combine all verification results
    verification_passed &= padding_structure_valid.unwrap_u8() == 1;

    verification_passed 
}