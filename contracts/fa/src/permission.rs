use serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize, BorshSchema};
use schemars::JsonSchema;


// Define the types of fields we expect in permissions
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug, PartialEq, Eq)]
pub enum FieldType {
    String,
    ArrayString,
    // TODO: Add other necessary types like Number, Boolean, Object etc. as needed
}

// Defines a single field within a permission schema
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FieldDefinition {
    pub name: String,
    pub field_type: FieldType,
    pub required: bool,
}

// Represents the schema for a specific FaPermissionType
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug, Default)]
pub struct PermissionSchema {
    pub fields: Vec<FieldDefinition>,
}