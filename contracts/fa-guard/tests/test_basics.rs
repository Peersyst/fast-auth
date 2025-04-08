use serde_json::json;

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    test_guards_crud(&contract_wasm).await?;
    test_verify(&contract_wasm).await?;
    Ok(())
}

async fn test_guards_crud(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;

    // Test adding a guard
    let outcome = contract
        .call("add_guard")
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
    let remove_outcome = contract
        .call("remove_guard")
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

async fn test_verify(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;
    
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