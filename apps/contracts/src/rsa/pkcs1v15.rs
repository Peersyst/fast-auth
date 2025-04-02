use crypto_bigint::{
    modular::{BoxedMontyForm, BoxedMontyParams},
    BoxedUint,
};
use core::cmp::Ordering;
use crypto_bigint::subtle::ConstantTimeEq;
use near_sdk::PromiseOrValue::Promise;
use crate::rsa::key::RsaPublicKey;
use crate::rsa::key::PublicKeyParts;

pub type Result<T> = core::result::Result<T, Error>;


pub enum Error {
    /// Verification error.
    Verification,
    /// Invalid padding length.
    InvalidPadLen,
}


pub fn verify(pub_key: &RsaPublicKey, prefix: &[u8], hashed: &[u8], sig: &BoxedUint) -> Result<()> {
    let n = pub_key.n();
    if sig >= n.as_ref() || sig.bits_precision() != pub_key.n_bits_precision() {
        return Err(Error::Verification);
    }

    // let enc = rsa_encrypt(pub_key, sig);
    // let em = uint_to_be_pad(enc?, pub_key.size())?;
    // pkcs1v15_sign_unpad(prefix, hashed, &em, pub_key.size())

    Result::Ok(())
}

#[inline]
pub fn rsa_encrypt<K: PublicKeyParts>(key: &K, m: &BoxedUint) -> Result<BoxedUint> {
    let res = pow_mod_params(m, key.e(), key.n_params());
    Ok(res)
}


/// Computes `base.pow_mod(exp, n)` with precomputed `n_params`.
fn pow_mod_params(base: &BoxedUint, exp: &BoxedUint, n_params: &BoxedMontyParams) -> BoxedUint {
    let base = reduce_vartime(base, n_params);
    base.pow(exp).retrieve()
}

fn reduce_vartime(n: &BoxedUint, p: &BoxedMontyParams) -> BoxedMontyForm {
    let bits_precision = p.modulus().bits_precision();
    let modulus = p.modulus().as_nz_ref().clone();

    let n = match n.bits_precision().cmp(&bits_precision) {
        Ordering::Less => n.widen(bits_precision),
        Ordering::Equal => n.clone(),
        Ordering::Greater => n.shorten(bits_precision),
    };

    let n_reduced = n.rem_vartime(&modulus).widen(p.bits_precision());
    BoxedMontyForm::new(n_reduced, p.clone())
}

#[inline]
fn left_pad(input: &[u8], padded_len: usize) -> Result<Vec<u8>> {
    if input.len() > padded_len {
        return Err(Error::InvalidPadLen);
    }

    let mut out = vec![0u8; padded_len];
    out[padded_len - input.len()..].copy_from_slice(input);
    Ok(out)
}

#[inline]
pub(crate) fn uint_to_be_pad(input: BoxedUint, padded_len: usize) -> Result<Vec<u8>> {
    let leading_zeros = input.leading_zeros() as usize / 8;
    left_pad(&input.to_be_bytes()[leading_zeros..], padded_len)
}

#[inline]
pub(crate) fn pkcs1v15_sign_unpad(prefix: &[u8], hashed: &[u8], em: &[u8], k: usize) -> Result<()> {
    let hash_len = hashed.len();
    let t_len = prefix.len() + hashed.len();
    if k < t_len + 11 {
        return Err(Error::Verification);
    }

    // EM = 0x00 || 0x01 || PS || 0x00 || T
    let mut ok = em[0].ct_eq(&0u8);
    ok &= em[1].ct_eq(&1u8);
    ok &= em[k - hash_len..k].ct_eq(hashed);
    ok &= em[k - t_len..k - hash_len].ct_eq(prefix);
    ok &= em[k - t_len - 1].ct_eq(&0u8);

    for el in em.iter().skip(2).take(k - t_len - 3) {
        ok &= el.ct_eq(&0xff)
    }

    if ok.unwrap_u8() != 1 {
        return Err(Error::Verification);
    }

    Ok(())
}