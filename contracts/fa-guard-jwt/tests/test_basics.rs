use serde_json::json;

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    test_implementations_crud(&contract_wasm).await?;
    Ok(())
}

async fn test_implementations_crud(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;

    let user_account = sandbox.dev_create_account().await?;

    // Test empty implementations
    let result = contract.call("get_implementations").view().await?;
    let implementations: std::collections::HashMap<String, String> = result.json()?;
    assert_eq!(implementations.len(), 0);

    // Test registering implementation
    let implementation_account = sandbox.dev_create_account().await?;
    contract
        .call("register_implementation")
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
    contract
        .call("unregister_implementation") 
        .args_json(("RS256".to_string(),))
        .transact()
        .await?;

    // Verify implementation was unregistered
    let result = contract.call("get_implementations").view().await?;
    let implementations: std::collections::HashMap<String, String> = result.json()?;
    assert_eq!(implementations.len(), 0);

    Ok(())
}

async fn test_verify(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;
    
    // Deploy a mock guard contract
    let mock_implementation = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/jwt_implementation.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = contract
        .call("register_implementation")
        .args_json(json!({
            "name": "mock",
            "implementation": mock_implementation.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Call verify with a test payload
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ",
        }))
        .transact()
        .await?;
    assert!(verify_outcome.is_success());

    // Wait for the promise to complete and check the callback result
    let result = verify_outcome.outcome();
    assert!(result.is_success());

    Ok(())
}

