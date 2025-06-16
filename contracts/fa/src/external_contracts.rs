use near_sdk::{ext_contract, PromiseOrValue};
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

// Guard interface, for cross-contract calls
#[ext_contract(external_guard)]
pub trait ExternalGuard {
    fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>) -> (bool, String);
}

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

#[ext_contract(mpc_contract)]
pub trait MPCContract {
    fn sign(&self, request: SignRequest) -> PromiseOrValue<SignResponse>;
}