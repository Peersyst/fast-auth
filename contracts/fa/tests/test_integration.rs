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
            "owner": owner.id(),
            "pauser": owner.id()
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
            "owner": owner.id(),
            "pauser": owner.id()
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

    // Call sign with a test payload (using ecdsa algorithm by default)
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "ecdsa"
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

    let mpc_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(mpc_domain_id, 1);

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

    // Test setting new domain ID
    let set_domain_outcome = contract
        .call("set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 42u64
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    let new_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(new_domain_id, 42);

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
            "owner": owner.id(),
            "pauser": owner.id()
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

    // Test pausing the contract (should work - owner is set as pauser)
    let pause_outcome = owner.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

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
            "owner": owner.id(),
            "pauser": owner.id()
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
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Pause the contract (owner is set as pauser)
    let pause_outcome = owner.call(contract.id(), "pause")
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

    // Test set_mpc_domain_id
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 123u64
        }))
        .transact()
        .await?;
    assert!(!set_domain_outcome.is_success());

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
            "owner": owner.id(),
            "pauser": owner.id()
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
            "owner": owner.id(),
            "pauser": owner.id()
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

    // Pause the contract (owner is set as pauser)
    let pause_outcome = owner.call(contract.id(), "pause")
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
            "owner": owner.id(),
            "pauser": owner.id()
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

    // Pause the contract (owner is set as pauser)
    let pause_outcome = owner.call(contract.id(), "pause")
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

    // Test that sign is blocked when paused (ecdsa)
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "ecdsa"
        }))
        .transact()
        .await?;
    assert!(!sign_outcome.is_success());

    // Test that sign is blocked when paused (secp256k1)
    let sign_legacy_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "secp256k1"
        }))
        .transact()
        .await?;
    assert!(!sign_legacy_outcome.is_success());

    // Test that sign is blocked when paused (eddsa)
    let sign_eddsa_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "eddsa"
        }))
        .transact()
        .await?;
    assert!(!sign_eddsa_outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_mpc_domain_id() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Test initial domain ID value (should be 0)
    let initial_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(initial_domain_id, 1);

    // Test setting new domain ID
    let new_domain_id = 12345u64;
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": new_domain_id
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // Test getting the new domain ID
    let updated_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(updated_domain_id, new_domain_id);

    // Test setting domain ID to maximum u64 value
    let max_domain_id = u64::MAX;
    let set_max_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": max_domain_id
        }))
        .transact()
        .await?;
    assert!(set_max_domain_outcome.is_success());

    let max_updated_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(max_updated_domain_id, max_domain_id);

    Ok(())
}

#[tokio::test]
async fn test_mpc_domain_id_authorization() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let unauthorized_user = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Test that unauthorized user cannot set domain ID
    let unauthorized_set_outcome = unauthorized_user.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 999u64
        }))
        .transact()
        .await?;
    assert!(!unauthorized_set_outcome.is_success());

    // Verify domain ID wasn't changed
    let domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(domain_id, 1); // Should still be default value

    // Test that owner can set domain ID
    let owner_set_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 999u64
        }))
        .transact()
        .await?;
    assert!(owner_set_outcome.is_success());

    // Verify domain ID was changed
    let updated_domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(updated_domain_id, 999);

    Ok(())
}

#[tokio::test]
async fn test_mpc_domain_id_blocked_when_paused() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Pause the contract
    let pause_outcome = owner.call(contract.id(), "pause")
        .transact()
        .await?;
    assert!(pause_outcome.is_success());

    // Test that set_mpc_domain_id is blocked when paused
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 123u64
        }))
        .transact()
        .await?;
    assert!(!set_domain_outcome.is_success());

    // Test that mpc_domain_id view is blocked when paused
    let domain_id_result = contract
        .call("mpc_domain_id")
        .view()
        .await;
    assert!(domain_id_result.is_err());

    // Unpause and verify operations work again
    let unpause_outcome = owner.call(contract.id(), "unpause")
        .transact()
        .await?;
    assert!(unpause_outcome.is_success());

    // Now set_mpc_domain_id should work
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 123u64
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // And mpc_domain_id view should work
    let domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(domain_id, 123);

    Ok(())
}

#[tokio::test]
async fn test_sign_legacy() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Deploy a mock mpc contract
    let mock_mpc = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/mpc.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Set the MPC address
    let set_mpc_outcome = owner.call(contract.id(), "set_mpc_address")
        .args_json(json!({
            "mpc_address": mock_mpc.id()
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    // Set MPC key version for legacy compatibility
    let set_version_outcome = owner.call(contract.id(), "set_mpc_key_version")
        .args_json(json!({
            "mpc_key_version": 1
        }))
        .transact()
        .await?;
    assert!(set_version_outcome.is_success());

    // Call sign with secp256k1 algorithm (legacy)
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "secp256k1"
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
async fn test_sign_v2() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Deploy a mock mpc contract
    let mock_mpc = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/mpc.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Set the MPC address
    let set_mpc_outcome = owner.call(contract.id(), "set_mpc_address")
        .args_json(json!({
            "mpc_address": mock_mpc.id()
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    // Set MPC domain ID for new version
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 42u64
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // Call sign with ecdsa algorithm (new version)
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "ecdsa"
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
async fn test_sign_legacy_vs_new_version_parameters() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Set different values for key_version and domain_id to test they're used correctly
    let set_version_outcome = owner.call(contract.id(), "set_mpc_key_version")
        .args_json(json!({
            "mpc_key_version": 5
        }))
        .transact()
        .await?;
    assert!(set_version_outcome.is_success());

    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 999u64
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // Verify the values are set correctly
    let key_version = contract
        .call("mpc_key_version")
        .view()
        .await?
        .json::<u32>()?;
    assert_eq!(key_version, 5);

    let domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(domain_id, 999);

    Ok(())
}

#[tokio::test]
async fn test_mpc_configuration_complete() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Test all MPC-related parameters together
    let new_mpc_address = "mpc.fast-auth.near";
    let new_key_version = 42u32;
    let new_domain_id = 1337u64;

    // Set MPC address
    let set_mpc_outcome = owner.call(contract.id(), "set_mpc_address")
        .args_json(json!({
            "mpc_address": new_mpc_address
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    // Set MPC key version
    let set_version_outcome = owner.call(contract.id(), "set_mpc_key_version")
        .args_json(json!({
            "mpc_key_version": new_key_version
        }))
        .transact()
        .await?;
    assert!(set_version_outcome.is_success());

    // Set MPC domain ID
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": new_domain_id
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // Verify all values are set correctly
    let mpc_address = contract
        .call("mpc_address")
        .view()
        .await?
        .json::<near_sdk::AccountId>()?;
    assert_eq!(mpc_address, new_mpc_address);

    let key_version = contract
        .call("mpc_key_version")
        .view()
        .await?
        .json::<u32>()?;
    assert_eq!(key_version, new_key_version);

    let domain_id = contract
        .call("mpc_domain_id")
        .view()
        .await?
        .json::<u64>()?;
    assert_eq!(domain_id, new_domain_id);

    Ok(())
}

#[tokio::test]
async fn test_sign_eddsa_algorithm() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
        }))
        .transact()
        .await?;

    // Deploy a mock guard contract
    let mock_guard = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
    
    // Deploy a mock mpc contract
    let mock_mpc = sandbox.dev_deploy(include_bytes!("../../target/wasm32-unknown-unknown/release/mpc.wasm")).await?;
    
    // Add the mock guard to the contract
    let add_outcome = owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_id": "jwt",
            "guard_address": mock_guard.id()
        }))
        .transact()
        .await?;
    assert!(add_outcome.is_success());

    // Set the MPC address
    let set_mpc_outcome = owner.call(contract.id(), "set_mpc_address")
        .args_json(json!({
            "mpc_address": mock_mpc.id()
        }))
        .transact()
        .await?;
    assert!(set_mpc_outcome.is_success());

    // Set MPC domain ID for new version
    let set_domain_outcome = owner.call(contract.id(), "set_mpc_domain_id")
        .args_json(json!({
            "mpc_domain_id": 42u64
        }))
        .transact()
        .await?;
    assert!(set_domain_outcome.is_success());

    // Call sign with eddsa algorithm
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "eddsa"
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
async fn test_sign_invalid_algorithm() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "init_guards": {},
            "owner": owner.id(),
            "pauser": owner.id()
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

    // Test invalid algorithm - should fail
    let sign_outcome = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "invalid_algorithm"
        }))
        .transact()
        .await?;

    assert!(!sign_outcome.is_success());

    // Test case-insensitive algorithms - should work
    let sign_outcome_upper = contract
        .call("sign")
        .args_json(json!({
            "guard_id": "jwt#mock",
            "verify_payload": "test_payload",
            "sign_payload": vec![1, 2, 3],
            "algorithm": "ECDSA"
        }))
        .transact()
        .await?;

    assert!(sign_outcome_upper.is_success());

    Ok(())
}