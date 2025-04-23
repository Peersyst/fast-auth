use serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize, BorshSchema};
use schemars::JsonSchema;

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaPermission {
    pub name: String,
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
}

impl FaPermission {
    pub fn new(name: String) -> Self {
        Self { name }
    }
}


