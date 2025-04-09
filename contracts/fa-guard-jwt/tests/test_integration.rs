use serde_json::json;

#[tokio::test]
async fn test_implementations_crud() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id()
        }))
        .transact()
        .await?;

    // Test empty implementations
    let result = contract.call("get_implementations").view().await?;
    let implementations: std::collections::HashMap<String, String> = result.json()?;
    assert_eq!(implementations.len(), 0);

    // Test registering implementation
    let implementation_account = sandbox.dev_create_account().await?;
    let _ = owner.call(contract.id(), "register_implementation")
        .args_json((
            "RS256".to_string(),
            implementation_account.id()
        ))
        .transact()
        .await?;

    // Verify implementation was registered
    let result = contract.call("get_implementations").view().await?;
    let implementations: std::collections::HashMap<String, String> = result.json()?;
    assert_eq!(implementations.len(), 1);
    assert_eq!(implementations.get("RS256").unwrap().to_string(), implementation_account.id().to_string());

    // Test unregistering implementation
    let _ = owner.call(contract.id(), "unregister_implementation")
        .args_json(("RS256".to_string(),))
        .transact()
        .await?;

    // Verify implementation was unregistered
    let result = contract.call("get_implementations").view().await?;
    let implementations: std::collections::HashMap<String, String> = result.json()?;
    assert_eq!(implementations.len(), 0);

    // Test registering implementation by non-owner (should fail)
    let non_owner = sandbox.dev_create_account().await?;
    let implementation_account = sandbox.dev_create_account().await?;
    let register_outcome = non_owner.call(contract.id(), "register_implementation")
        .args_json((
            "RS256".to_string(),
            implementation_account.id()
        ))
        .transact()
        .await?;
    assert!(!register_outcome.is_success());

    // Test unregistering implementation by non-owner (should fail)
    let _ = owner.call(contract.id(), "register_implementation")
        .args_json((
            "RS256".to_string(), 
            implementation_account.id()
        ))
        .transact()
        .await?;

    let unregister_outcome = non_owner.call(contract.id(), "unregister_implementation")
        .args_json(("RS256".to_string(),))
        .transact()
        .await?;
    assert!(!unregister_outcome.is_success());

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
async fn test_verify_should_fail_on_invalid_jwt() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    
    // Deploy a mock guard contract
    let mock_implementation = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/jwt_implementation.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = contract
        .call("register_implementation")
        .args_json(json!({
            "name": "RS256",
            "implementation": mock_implementation.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Call verify with a test payload
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0", // NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ
        }))
        .transact()
        .await?;
    assert!(!verify_outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_verify_should_pass_on_valid_jwt() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Deploy a mock guard contract
    let mock_implementation = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/jwt_implementation.wasm")).await?;

    // Add the mock guard to the contract
    let add_outcome = contract
        .call("register_implementation")
        .args_json(json!({
            "name": "RS256",
            "implementation": mock_implementation.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Call verify with a test payload
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ"
        }))
        .transact()
        .await?;
    assert!(verify_outcome.is_success());

    Ok(())
}
