//! Create and parses JWT (JSON Web Tokens)
//!
//! Documentation:  [stable](https://docs.rs/jsonwebtoken/)
#![deny(missing_docs)]

mod algorithms;
/// Lower level functions, if you want to do something other than JWTs
pub(crate) mod crypto;
mod decoding;
mod encoding;
/// All the errors that can be encountered while encoding/decoding JWTs
pub mod errors;
mod header;
pub mod jwk;
// #[cfg(feature = "use_pem")]
pub(crate) mod pem;
mod serialization;
mod validation;

pub(crate) use algorithms::Algorithm;
pub(crate) use decoding::{decode, decode_header, DecodingKey, TokenData};
pub(crate) use encoding::{encode, EncodingKey};
pub(crate) use header::Header;
pub(crate) use validation::{get_current_timestamp, Validation};
pub(crate) use errors::*;
