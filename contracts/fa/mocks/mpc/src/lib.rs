use near_sdk::{near};
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;


#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct AffinePoint {
    affine_point: String,
}

#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Scalar {
    scalar: String,
}

#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignResponse {
    scheme: String,
    big_r: AffinePoint,
    s: Scalar,
    recovery_id: u8, 
}

#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SignRequest {
    pub payload: Vec<u8>,
    pub path: String,
    pub key_version: u32,
}


#[near(contract_state)]
pub struct MockMPC {
    pub key_version: u32,
}

impl Default for MockMPC {
    fn default() -> Self {
        Self { key_version: 0 }
    }
}

#[near]
impl MockMPC {
    pub fn sign(&self, _request: SignRequest) -> SignResponse {
        // For testing, we'll just return true if the payload is not empty
        SignResponse {
            scheme: "ecdsa".to_string(),
            big_r: AffinePoint { affine_point: "0x1234567890abcdef".to_string() },
            s: Scalar { scalar: "0x1234567890abcdef".to_string() },
            recovery_id: 0,
        }
    }
}
