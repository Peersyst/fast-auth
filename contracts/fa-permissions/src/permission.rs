use serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use borsh::BorshSchema;
use schemars::JsonSchema;

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaPermission {
    pub name: String,
    // TODO: TA-4436: Define permissions 
}

impl FaPermission {
    pub fn new(name: String) -> Self {
        Self { name }
    }
}


