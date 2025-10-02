use near_sdk::{near, ext_contract, PromiseOrValue};
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::fmt::Debug;

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

#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize)]
#[serde(crate = "near_sdk::serde")]
pub enum PayloadType {
    Ecdsa(String),
    Eddsa(String),
}

#[derive(Serialize, Deserialize, JsonSchema, BorshDeserialize, BorshSerialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SignRequestV2 {
    pub path: String,
    // Either one of the following two must be present.
    pub payload_v2: PayloadType,
    // Either one of the following two must be present.
    pub domain_id: u64,
}

/// A byte array with a statically encoded minimum and maximum length.
/// The `new` function as well as json deserialization checks that the length is within bounds.
/// The borsh deserialization does not perform such checks, as the borsh serialization is only
/// used for internal contract storage.
#[derive(Clone, Eq, Ord, PartialEq, PartialOrd)]
#[near(serializers=[borsh])]
pub struct Bytes<const MIN_LEN: usize, const MAX_LEN: usize>(Vec<u8>);

#[ext_contract(mpc_contract_legacy)]
pub trait MPCContractLegacy {
    fn sign(&self, request: SignRequest) -> PromiseOrValue<SignResponse>;
}

#[ext_contract(mpc_contract)]
pub trait MPCContract {
    fn sign(&self, request: SignRequestV2) -> PromiseOrValue<SignResponse>;
}