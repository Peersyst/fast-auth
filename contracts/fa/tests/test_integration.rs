use serde_json::json;
use fa::permission::{PermissionSchema, FieldType};

#[tokio::test]
async fn test_guards_crud() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id()
        }))
        .transact()
        .await?;

    // Test adding a guard
    let outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": "jwt.fast-auth.near"
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());

    // Test getting an existing guard
    let guard_outcome = contract
        .call("get_guard")
        .args_json(json!({
            "guard_id": "jwt"
        }))
        .view()
        .await?;
    assert_eq!(guard_outcome.json::<String>()?, "jwt.fast-auth.near");

    // Test getting a non-existent guard (should panic)
    let non_existent_outcome = contract
        .call("get_guard")
        .args_json(json!({
            "guard_id": "non_existent"
        }))
        .view()
        .await;
    assert!(non_existent_outcome.is_err());

    // Test removing a guard
    let remove_outcome = owner.call(contract.id(), "remove_guard")
        .args_json(json!({
            "guard_id": "jwt"
        }))
        .transact()
        .await?;
    assert!(remove_outcome.is_success());

    // Verify guard was removed by trying to get it (should panic)
    let removed_guard_outcome = contract
        .call("get_guard")
        .args_json(json!({
            "guard_id": "jwt"
        }))
        .view()
        .await;
    assert!(removed_guard_outcome.is_err());

    Ok(())
}

#[tokio::test]
async fn test_owner() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id()
        }))
        .transact()
        .await?;

    // Test getting the owner
    let owner_outcome = contract
        .call("owner")
        .view()
        .await?;
    assert_eq!(owner_outcome.json::<String>()?, owner.id().to_string());

    // Test changing the owner
    let new_owner = sandbox.dev_create_account().await?;
    let change_owner_outcome = owner.call(contract.id(), "change_owner")
        .args_json(json!({
            "new_owner": new_owner.id()
        }))
        .transact()
        .await?;
    assert!(change_owner_outcome.is_success());

    // Test getting the new owner
    let new_owner_outcome = contract
        .call("owner")
        .view()
        .await?;
    assert_eq!(new_owner_outcome.json::<String>()?, new_owner.id().to_string());

    Ok(())
}

#[tokio::test]
async fn test_verify() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    
    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = contract
        .call("add_guard")
        .args_json(json!({
            "guard_id": "mock",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Call verify with a test payload
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "guard_id": "mock",
            "payload": "test_payload"
        }))
        .transact()
        .await?;
    assert!(verify_outcome.is_success());

    // Wait for the promise to complete and check the callback result
    let result = verify_outcome.outcome();
    assert!(result.is_success());

    Ok(())
}

#[tokio::test]
async fn test_sign() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Deploy a mock mpc contract
    let mock_mpc = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/mpc.wasm")).await?;
    
    // Add the mock mpc to the contract
    let add_outcome = contract
        .call("add_guard")
        .args_json(json!({
            "guard_id": "mock",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Set the MPC address
    let set_mpc_outcome = contract
        .call("set_mpc_address")
        .args_json(json!({
            "mpc_address": mock_mpc.id()
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    // Call sign with a test payload
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "mock",
            "payload": [1, 2, 3],
            "jwt": "test_jwt"
        }))
        .transact()
        .await?;

    assert!(sign_outcome.is_success());

    // Wait for the promise to complete and check the callback result
    let result = sign_outcome.outcome();
    assert!(result.is_success());

    Ok(())
}

#[tokio::test]
async fn test_mpc() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Test initial values
    let mpc_address = contract
        .call("mpc_address")
        .view()
        .await?
        .json::<near_sdk::AccountId>()?;
    assert_eq!(mpc_address, *contract.id());

    let mpc_key_version = contract
        .call("mpc_key_version") 
        .view()
        .await?
        .json::<u32>()?;
    assert_eq!(mpc_key_version, 0);

    // Test setting new MPC address
    let set_mpc_outcome = contract
        .call("set_mpc_address")
        .args_json(json!({
            "mpc_address": "mpc.fast-auth.near"
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    let new_mpc_address = contract
        .call("mpc_address")
        .view()
        .await?
        .json::<near_sdk::AccountId>()?;
    assert_eq!(new_mpc_address, "mpc.fast-auth.near");

    // Test setting new key version
    let set_version_outcome = contract
        .call("set_mpc_key_version")
        .args_json(json!({
            "mpc_key_version": 1
        }))
        .transact()
        .await?;
    assert!(set_version_outcome.is_success());

    let new_key_version = contract
        .call("mpc_key_version")
        .view()
        .await?
        .json::<u32>()?;
    assert_eq!(new_key_version, 1);

    Ok(())
}


#[tokio::test]
async fn test_permission_schema() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Test adding a new permission schema
    let add_schema_outcome = contract
        .call("add_permission_schema")
        .args_json(json!({
            "permission_type": "basic_access",
            "schema": {
                "fields": [
                    {
                        "name": "resource",
                        "field_type": "String",
                        "required": true
                    },
                    {
                        "name": "actions",
                        "field_type": "ArrayString", 
                        "required": true
                    }
                ]
            }
        }))
        .transact()
        .await?;
    assert!(add_schema_outcome.is_success());

    // Test getting the schema
    let schema = contract
        .call("get_permission_schema")
        .args_json(json!({
            "permission_type": "basic_access"
        }))
        .view()
        .await?
        .json::<PermissionSchema>()?;
    
    assert_eq!(schema.fields.len(), 2);
    assert_eq!(schema.fields[0].name, "resource");
    assert_eq!(schema.fields[0].field_type, FieldType::String);
    assert!(schema.fields[0].required);
    assert_eq!(schema.fields[1].name, "actions");
    assert_eq!(schema.fields[1].field_type, FieldType::ArrayString);
    assert!(schema.fields[1].required);

    // Test validating permissions against schema
    let validate_result = contract
        .call("verify_permission")
        .args_json(json!({
            "permission_json": "{\"permission_type\":\"basic_access\",\"resource\":\"file1\",\"actions\":[\"read\",\"write\"]}"
        }))
        .view()
        .await?
        .json::<bool>()?;
    assert!(validate_result);

    // Test validation failure with invalid permission
    let invalid_result = contract
        .call("verify_permission")
        .args_json(json!({
            "permission_json": "{\"permission_type\":\"basic_access\",\"resource\":\"file1\"}"
        }))
        .view()
        .await?
        .json::<bool>()?;
    assert!(!invalid_result);

    Ok(())
}