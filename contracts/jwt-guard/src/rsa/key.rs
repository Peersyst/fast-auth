use crypto_bigint::{BoxedUint, NonZero};
use crypto_bigint::modular::BoxedMontyParams;

pub struct RsaPublicKey {
    /// Modulus: product of prime numbers `p` and `q`
    pub n: NonZero<BoxedUint>,
    /// Public exponent: power to which a plaintext message is raised in
    /// order to encrypt it.
    ///
    /// Typically `0x10001` (`65537`)
    pub e: BoxedUint,

    pub n_params: BoxedMontyParams,
}

pub trait PublicKeyParts {
    /// Returns the modulus of the key.
    fn n(&self) -> &NonZero<BoxedUint>;

    /// Returns the public exponent of the key.
    fn e(&self) -> &BoxedUint;

    /// Returns the modulus size in bytes. Raw signatures and ciphertexts for
    /// or by this public key will have the same size.
    fn size(&self) -> usize {
        (self.n().bits() as usize).div_ceil(8)
    }

    /// Returns the parameters for montgomery operations.
    fn n_params(&self) -> &BoxedMontyParams;

    /// Returns precision (in bits) of `n`.
    fn n_bits_precision(&self) -> u32 {
        self.n().bits_precision()
    }
}


impl PublicKeyParts for RsaPublicKey {
    fn n(&self) -> &NonZero<BoxedUint> {
        &self.n
    }

    fn e(&self) -> &BoxedUint {
        &self.e
    }

    fn n_params(&self) -> &BoxedMontyParams {
        &self.n_params
    }
}
