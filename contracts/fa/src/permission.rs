use serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize, BorshSchema};
use schemars::JsonSchema;


// Define the types of fields we expect in permissions
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug, PartialEq, Eq)]
pub enum FieldType {
    String,
    ArrayString,
    // Add other necessary types like Number, Boolean, Object etc. as needed
}

// Defines a single field within a permission schema
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct FieldDefinition {
    pub name: String,
    pub field_type: FieldType,
    // Add 'required: bool' if you need to distinguish mandatory/optional fields
    pub required: bool,
}

// Represents the schema for a specific FaPermissionType
#[derive(BorshSerialize, BorshDeserialize, BorshSchema, Serialize, Deserialize, JsonSchema, Clone, Debug, Default)]
pub struct PermissionSchema {
    // Using a Vec allows ordered fields, but HashMap ensures unique names.
    // Choose based on your needs. Vec is simpler for iteration.
    pub fields: Vec<FieldDefinition>,
}