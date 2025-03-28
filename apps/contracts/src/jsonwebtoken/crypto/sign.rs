use ring::constant_time::verify_slices_are_equal;
use ring::{hmac, signature};

// Bring parent module imports into scope for submodules
use crate::jsonwebtoken::algorithms::Algorithm;
use crate::jsonwebtoken::errors::Result;
use crate::jsonwebtoken::serialization::{b64_encode};
use crate::jsonwebtoken::decoding::{DecodingKey, DecodingKeyKind};
use crate::jsonwebtoken::encoding::EncodingKey;
use crate::jsonwebtoken::crypto::rsa;

use crate::jsonwebtoken::crypto::ecdsa;
use crate::jsonwebtoken::crypto::eddsa;

/// The actual HS signing + encoding
/// Could be in its own file to match RSA/EC but it's 2 lines...
pub(crate) fn sign_hmac(alg: hmac::Algorithm, key: &[u8], message: &[u8]) -> String {
    let digest = hmac::sign(&hmac::Key::new(alg, key), message);
    b64_encode(digest)
}

/// Take the payload of a JWT, sign it using the algorithm given and return
/// the base64 url safe encoded of the result.
///
/// If you just want to encode a JWT, use `encode` instead.
pub fn sign(message: &[u8], key: &EncodingKey, algorithm: Algorithm) -> Result<String> {
    match algorithm {
        Algorithm::HS256 => Ok(sign_hmac(hmac::HMAC_SHA256, key.inner(), message)),
        Algorithm::HS384 => Ok(sign_hmac(hmac::HMAC_SHA384, key.inner(), message)),
        Algorithm::HS512 => Ok(sign_hmac(hmac::HMAC_SHA512, key.inner(), message)),

        Algorithm::ES256 | Algorithm::ES384 => {
            ecdsa::sign(ecdsa::alg_to_ec_signing(algorithm), key.inner(), message)
        }

        Algorithm::EdDSA => eddsa::sign(key.inner(), message),

        Algorithm::RS256
        | Algorithm::RS384
        | Algorithm::RS512
        | Algorithm::PS256
        | Algorithm::PS384
        | Algorithm::PS512 => rsa::sign(rsa::alg_to_rsa_signing(algorithm), key.inner(), message),
    }
}