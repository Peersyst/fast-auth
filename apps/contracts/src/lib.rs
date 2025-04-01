use crypto_bigint::modular::BoxedMontyParams;
use crypto_bigint::{NonZero, BoxedUint, Odd};
// Find all our documentation at https://docs.near.org
use near_sdk::{log, near};
use serde::{Deserialize, Serialize};
use crate::rsa::pkcs1v15::verify;
use crate::rsa::key::RsaPublicKey;

pub mod rsa;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    aud: Vec<String>,
    sub: String,
    pepe: String,
    exp: u64,
}

// Define the contract structure
#[near(contract_state)]
pub struct Contract{
    greetings: String,
}

// Define the default, which automatically initializes the contract
impl Default for Contract {
    fn default() -> Self {
        Self {
            greetings: "Hello World!".to_string(),
        }
    }
}

// Implement the contract structure
#[near]
impl Contract {
    pub fn verify_jwt(&self) -> bool {
        verify(&RsaPublicKey{
            n: NonZero::new(BoxedUint::one()).expect("Non-zero value required"),
            e: BoxedUint::one(),
            n_params: BoxedMontyParams::new(Odd::new(BoxedUint::one()).expect("Odd value required")),
        }, b"prefix", b"hashed", &BoxedUint::one());
        true
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
    fn verify_jwt() {
        let mut contract = Contract::default();
        assert_eq!(contract.verify_jwt(), true);
    }

   
}
