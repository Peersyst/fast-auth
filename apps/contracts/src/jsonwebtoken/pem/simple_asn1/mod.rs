//! A small ASN.1 parsing library for Rust. In particular, this library is used
//! to translate the binary DER encoding of an ASN.1-formatted document into the
//! core primitives of ASN.1. It is assumed that you can do what you need to
//! from there.
//!
//! The critical items for this document are the traits `ToASN1` and `FromASN1`.
//! The first takes your data type and encodes it into a `Vec` of simple ASN.1
//! structures (`ASN1Block`s). The latter inverts the process.
//!
//! Items that implement `ToASN1` can be used with the function `der_encode`
//! to provide single-step encoding of a data type to binary DER encoding.
//! Similarly, items that are `FromASN` can be single-step decoded using
//! the helper function `der_decode`.
//!
//! You can implement one or both traits, depending on your needs. If you do
//! implement both, the obvious encode/decode quickcheck property is strongly
//! advised.
//!
//! For decoding schemes that require the actual bytes associated with the
//! binary representation, we also provide `FromASN1WithBody`. This can be
//! used with the offset information in the primitive `ASN1Block`s to, for
//! example, validate signatures in X509 documents.
//!
//! Finally, this library supports ASN.1 class information. I'm still not sure
//! why it's useful, but there it is.
//!
//! Please send any bug reports, patches, and curses to the GitHub repository
//! at <code>https://github.com/acw/simple_asn1</code>.
pub(crate) mod simple_asn1;

pub use simple_asn1::*;

