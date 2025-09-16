use serde_json::json;

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

    // Test adding a guard with a forbidden character
    let _outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt#test",
            "guard_address": "jwt.fast-auth.near"
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
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = contract
        .call("add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Call verify with an invalid guard_id
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "guard_id": "test",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3]
        }))
        .transact()
        .await?;
    assert!(!verify_outcome.is_success());

    // Call verify with a test payload
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3]
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
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Deploy a mock mpc contract
    let mock_mpc = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/mpc.wasm")).await?;
    
    // Add the mock mpc to the contract
    let add_outcome = contract
        .call("add_guard")
        .args_json(json!({
            "guard_id": "jwt",
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
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3]
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
async fn test_pause() -> Result<(), Box<dyn std::error::Error>> {
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

    // Test initial paused state
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, false);

    // Test pausing the contract (should fail - only pauser can pause, not owner)
    let pause_outcome = owner.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(!pause_outcome.is_success());

    // Test unpausing the contract (should work - owner can unpause)
    let unpause_outcome = owner.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(unpause_outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_pauser_functionality() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let pauser = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id()
        }))
        .transact()
        .await?;

    // Test setting pauser (should work - owner can set pauser)
    let set_pauser_outcome = owner.call(contract.id(), "set_pauser")
        .args_json(json!({
            "pauser": pauser.id()
        }))
        .transact()
        .await?;
    assert!(set_pauser_outcome.is_success());

    // Test pausing with the new pauser (should work)
    let pause_outcome = pauser.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

    // Verify contract is paused
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, true);

    // Test unpausing with owner (should work)
    let unpause_outcome = owner.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(unpause_outcome.is_success());

    // Verify contract is unpaused
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, false);

    Ok(())
}

#[tokio::test]
async fn test_paused_operations_blocked() -> Result<(), Box<dyn std::error::Error>> {
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

    // Pause the contract
    let pause_outcome = contract
        .call("pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

    // Test that operations are blocked when paused
    // Test add_guard
    let add_guard_outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": "jwt.fast-auth.near"
        }))
        .transact()
        .await?;
    assert!(!add_guard_outcome.is_success());

    // Test remove_guard
    let remove_guard_outcome = owner.call(contract.id(), "remove_guard")
        .args_json(json!({
            "guard_id": "jwt"
        }))
        .transact()
        .await?;
    assert!(!remove_guard_outcome.is_success());

    // Test change_owner
    let new_owner = sandbox.dev_create_account().await?;
    let change_owner_outcome = owner.call(contract.id(), "change_owner")
        .args_json(json!({
            "new_owner": new_owner.id()
        }))
        .transact()
        .await?;
    assert!(!change_owner_outcome.is_success());

    // Test set_mpc_address
    let set_mpc_outcome = owner.call(contract.id(), "set_mpc_address")
        .args_json(json!({
            "mpc_address": "mpc.fast-auth.near"
        }))
        .transact()
        .await?;
    assert!(!set_mpc_outcome.is_success());

    // Test set_mpc_key_version
    let set_version_outcome = owner.call(contract.id(), "set_mpc_key_version")
        .args_json(json!({
            "mpc_key_version": 1
        }))
        .transact()
        .await?;
    assert!(!set_version_outcome.is_success());

    // Test view functions that should still work when paused
    // Test paused (should work - this is the only view function that works when paused)
    let _paused_result = contract
        .call("paused")
        .view()
        .await?;

    // Test that owner() is blocked when paused (should panic)
    let owner_result = contract
        .call("owner")
        .view()
        .await;
    assert!(owner_result.is_err());

    Ok(())
}

#[tokio::test]
async fn test_pause_unpause_authorization() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let pauser = sandbox.dev_create_account().await?;
    let unauthorized_user = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id()
        }))
        .transact()
        .await?;

    // Set pauser to a different account (owner can set pauser)
    let set_pauser_outcome = owner.call(contract.id(), "set_pauser")
        .args_json(json!({
            "pauser": pauser.id()
        }))
        .transact()
        .await?;
    assert!(set_pauser_outcome.is_success());

    // Test that owner cannot pause (only pauser can)
    let owner_pause_outcome = owner.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(!owner_pause_outcome.is_success());

    // Test that unauthorized user cannot pause
    let unauthorized_pause_outcome = unauthorized_user.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(!unauthorized_pause_outcome.is_success());

    // Test that pauser can pause
    let pauser_pause_outcome = pauser.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(pauser_pause_outcome.is_success());

    // Verify contract is paused
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, true);

    // Test that pauser cannot unpause (only owner can)
    let pauser_unpause_outcome = pauser.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(!pauser_unpause_outcome.is_success());

    // Test that unauthorized user cannot unpause
    let unauthorized_unpause_outcome = unauthorized_user.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(!unauthorized_unpause_outcome.is_success());

    // Test that owner can unpause
    let owner_unpause_outcome = owner.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(owner_unpause_outcome.is_success());

    // Verify contract is unpaused
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, false);

    Ok(())
}

#[tokio::test]
async fn test_paused_state_management() -> Result<(), Box<dyn std::error::Error>> {
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

    // Test initial paused state
    let initial_paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(initial_paused_state, false);

    // Pause the contract
    let pause_outcome = contract
        .call("pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

    // Test paused state after pausing
    let paused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(paused_state, true);

    // Unpause the contract
    let unpause_outcome = owner.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(unpause_outcome.is_success());

    // Test paused state after unpausing
    let unpaused_state = contract
        .call("paused")
        .view()
        .await?
        .json::<bool>()?;
    assert_eq!(unpaused_state, false);

    Ok(())
}

#[tokio::test]
async fn test_verify_and_sign_blocked_when_paused() -> Result<(), Box<dyn std::error::Error>> {
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

    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Pause the contract
    let pause_outcome = contract
        .call("pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

    // Test that verify is blocked when paused
    let verify_outcome = contract
        .call("verify")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3]
        }))
        .transact()
        .await?;
    assert!(!verify_outcome.is_success());

    // Test that sign is blocked when paused
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3]
        }))
        .transact()
        .await?;
    assert!(!sign_outcome.is_success());

    Ok(())
}