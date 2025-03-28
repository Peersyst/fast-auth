use ring::constant_time::verify_slices_are_equal;
use ring::{hmac, signature};

// Bring parent module imports into scope for submodules
use crate::jsonwebtoken::algorithms::Algorithm;
use crate::jsonwebtoken::errors::Result;
use crate::jsonwebtoken::serialization::{b64_decode};
use crate::jsonwebtoken::decoding::{DecodingKey, DecodingKeyKind};
use crate::jsonwebtoken::encoding::EncodingKey;
use crate::jsonwebtoken::crypto::sign::sign;
use crate::jsonwebtoken::crypto::ecdsa;
use crate::jsonwebtoken::crypto::eddsa;
use crate::jsonwebtoken::crypto::rsa;


/// See Ring docs for more details
fn verify_ring(
    alg: &'static dyn signature::VerificationAlgorithm,
    signature: &str,
    message: &[u8],
    key: &[u8],
) -> Result<bool> {
    let signature_bytes = b64_decode(signature)?;
    let public_key = signature::UnparsedPublicKey::new(alg, key);
    let res = public_key.verify(message, &signature_bytes);

    Ok(res.is_ok())
}

/// Compares the signature given with a re-computed signature for HMAC or using the public key
/// for RSA/EC.
///
/// If you just want to decode a JWT, use `decode` instead.
///
/// `signature` is the signature part of a jwt (text after the second '.')
///
/// `message` is base64(header) + "." + base64(claims)
pub fn verify(
    signature: &str,
    message: &[u8],
    key: &DecodingKey,
    algorithm: Algorithm,
) -> Result<bool> {
    match algorithm {
        Algorithm::HS256 | Algorithm::HS384 | Algorithm::HS512 => {
            // we just re-sign the message with the key and compare if they are equal
            let signed = sign(message, &EncodingKey::from_secret(key.as_bytes()), algorithm)?;
            Ok(verify_slices_are_equal(signature.as_ref(), signed.as_ref()).is_ok())
        }
        Algorithm::ES256 | Algorithm::ES384 => verify_ring(
            ecdsa::alg_to_ec_verification(algorithm),
            signature,
            message,
            key.as_bytes(),
        ),
        Algorithm::EdDSA => verify_ring(
            eddsa::alg_to_ec_verification(algorithm),
            signature,
            message,
            key.as_bytes(),
        ),
        Algorithm::RS256
        | Algorithm::RS384
        | Algorithm::RS512
        | Algorithm::PS256
        | Algorithm::PS384
        | Algorithm::PS512 => {
            let alg = rsa::alg_to_rsa_parameters(algorithm);
            match &key.kind {
                DecodingKeyKind::SecretOrDer(bytes) => verify_ring(alg, signature, message, bytes),
                DecodingKeyKind::RsaModulusExponent { n, e } => {
                    rsa::verify_from_components(alg, signature, message, (n, e))
                }
            }
        }
    }
}
