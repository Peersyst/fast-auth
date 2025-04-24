use serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize, BorshSchema};
use schemars::JsonSchema;
use near_sdk::serde_json;

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub enum FaPermissionType {
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
    #[serde(rename = "permission:evm")]
    EVMPermission,
    #[serde(rename = "permission:btc")]
    BTCPermission,
    #[serde(rename = "permission:near")]
    NearPermission,
}

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaPermission {
    pub permission_type: FaPermissionType,
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
}

impl FaPermission {
    pub fn new(permission_type: FaPermissionType) -> Self {
        Self { permission_type }
    }
}

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaEVMPermissions {
    pub permission_type: FaPermissionType,
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
}

impl FaEVMPermissions {
    pub fn new(permission_type: FaPermissionType) -> Self {
        Self { permission_type }
    }
}

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaBTCPermissions {
    pub permission_type: FaPermissionType,
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
}

impl FaBTCPermissions {
    pub fn new(permission_type: FaPermissionType) -> Self {
        Self { permission_type }
    }
}

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FaNearPermissions {
    pub permission_type: FaPermissionType,
    // TODO: TA-4436: Define permissions (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
}

impl FaNearPermissions {
    pub fn new(permission_type: FaPermissionType) -> Self {
        Self { permission_type }
    }
}

pub fn decode_permission_type(permission: String) -> FaPermissionType {
    let permission_json: serde_json::Value = serde_json::from_str(&permission)
        .expect("Failed to parse permission JSON");
    
    let permission_type = permission_json["permission_type"]
        .as_str()
        .expect("permission_type field missing or invalid");

    serde_json::from_str::<FaPermissionType>(&format!("\"{}\"", permission_type))
        .expect("Failed to deserialize permission type")
}