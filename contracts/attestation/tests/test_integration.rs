use serde_json::json;

#[tokio::test]
async fn test_contract_initialization() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    
    let dao = sandbox.dev_create_account().await?;
    let attester1 = sandbox.dev_create_account().await?;
    let attester2 = sandbox.dev_create_account().await?;
    
    // Initialize contract
    let outcome = dao
        .call(contract.id(), "new")
        .args_json(json!({
            "quorum": 2,
            "super_admins": [dao.id()],
            "attesters": [attester1.id(), attester2.id()]
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    // Verify initialization
    let quorum: u32 = contract.view("get_quorum").await?.json()?;
    assert_eq!(quorum, 2);
    
    // Verify DAO has the DAO role
    let has_dao_role: bool = contract
        .view("acl_has_role")
        .args_json(json!({
            "role": "DAO",
            "account_id": dao.id()
        }))
        .await?.json()?;
    assert!(has_dao_role);
    
    let attesters: Vec<String> = contract
        .view("get_attesters")
        .args_json(json!({"from_index": 0, "limit": 10}))
        .await?.json()?;
    assert_eq!(attesters.len(), 2);
    
    Ok(())
}

#[tokio::test]
async fn test_get_public_keys() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, _attester1, _attester2) = setup_contract().await?;
    
    let public_keys: Vec<serde_json::Value> = contract.view("get_public_keys").await?.json()?;
    assert_eq!(public_keys.len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_get_quorum() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, _attester1, _attester2) = setup_contract().await?;
    
    let quorum: u32 = contract.view("get_quorum").await?.json()?;
    assert_eq!(quorum, 2);
    
    Ok(())
}

#[tokio::test]
async fn test_get_attesters() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, attester2) = setup_contract().await?;
    
    let attesters: Vec<String> = contract
        .view("get_attesters")
        .args_json(json!({"from_index": 0, "limit": 10}))
        .await?.json()?;
    assert_eq!(attesters.len(), 2);
    assert!(attesters.contains(&attester1.id().to_string()));
    assert!(attesters.contains(&attester2.id().to_string()));
    
    Ok(())
}

#[tokio::test]
async fn test_attest_keys_single_attester() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, _attester2) = setup_contract().await?;
    
    let public_keys = vec![
        json!({"n": [1, 2, 3], "e": [4, 5, 6]}),
    ];
    
    let outcome = attester1
        .call(contract.id(), "attest_keys")
        .args_json(json!({
            "public_keys": public_keys
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    // Verify attestation is stored
    let attestation: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester1.id()}))
        .await?
        .json()?;
    assert!(attestation.is_some());
    
    // Public keys should NOT be set yet (quorum is 2)
    let public_keys_result: Vec<serde_json::Value> = contract.view("get_public_keys").await?.json()?;
    assert_eq!(public_keys_result.len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_attest_keys_reaches_quorum() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, attester2) = setup_contract().await?;
    
    let public_keys = vec![
        json!({"n": [1, 2, 3], "e": [4, 5, 6]}),
        json!({"n": [7, 8, 9], "e": [10, 11, 12]}),
    ];
    
    // First attester attests
    let outcome = attester1
        .call(contract.id(), "attest_keys")
        .args_json(json!({
            "public_keys": public_keys
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    // Second attester attests with same keys
    let outcome = attester2
        .call(contract.id(), "attest_keys")
        .args_json(json!({
            "public_keys": public_keys
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    // Public keys SHOULD be set now
    let public_keys_result: Vec<serde_json::Value> = contract.view("get_public_keys").await?.json()?;
    assert_eq!(public_keys_result.len(), 2);
    
    // Attestations should be cleared
    let attestation1: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester1.id()}))
        .await?
        .json()?;
    assert!(attestation1.is_none());
    
    Ok(())
}

#[tokio::test]
async fn test_attest_keys_different_hashes() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, attester2) = setup_contract().await?;
    
    let public_keys1 = vec![json!({"n": [1, 2, 3], "e": [4, 5, 6]})];
    let public_keys2 = vec![json!({"n": [7, 8, 9], "e": [10, 11, 12]})];
    
    // First attester attests
    let _ = attester1
        .call(contract.id(), "attest_keys")
        .args_json(json!({"public_keys": public_keys1}))
        .transact()
        .await?;
    
    // Second attester attests with DIFFERENT keys
    let _ =attester2
        .call(contract.id(), "attest_keys")
        .args_json(json!({"public_keys": public_keys2}))
        .transact()
        .await?;
    
    // Public keys should NOT be set (different hashes)
    let public_keys_result: Vec<serde_json::Value> = contract.view("get_public_keys").await?.json()?;
    assert_eq!(public_keys_result.len(), 0);
    
    // Both attestations should exist
    let attestation1: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester1.id()}))
        .await?
        .json()?;
    assert!(attestation1.is_some());
    
    let attestation2: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester2.id()}))
        .await?
        .json()?;
    assert!(attestation2.is_some());
    
    Ok(())
}

#[tokio::test]
async fn test_attest_keys_without_role_fails() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, _attester1, _attester2) = setup_contract().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let non_attester = sandbox.dev_create_account().await?;
    
    let public_keys = vec![json!({"n": [1, 2, 3], "e": [4, 5, 6]})];
    
    let outcome = non_attester
        .call(contract.id(), "attest_keys")
        .args_json(json!({"public_keys": public_keys}))
        .transact()
        .await?;
    
    assert!(outcome.is_failure());
    
    Ok(())
}

#[tokio::test]
async fn test_set_quorum_not_dao_fails() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, _attester2) = setup_contract().await?;
    
    // Try to set quorum as an attester (not DAO) - should fail due to access control
    let outcome = attester1
        .call(contract.id(), "set_quorum")
        .args_json(json!({"quorum": 1}))
        .transact()
        .await?;
    
    assert!(outcome.is_failure());
    
    Ok(())
}

#[tokio::test]
async fn test_acl_grant_role() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, dao, _attester1, _attester2) = setup_contract().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let new_attester = sandbox.dev_create_account().await?;
    
    let outcome = dao
        .call(contract.id(), "acl_grant_role")
        .args_json(json!({
            "role": "Attester",
            "account_id": new_attester.id()
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    let attesters: Vec<String> = contract
        .view("get_attesters")
        .args_json(json!({"from_index": 0, "limit": 10}))
        .await?.json()?;
    assert_eq!(attesters.len(), 3);
    assert!(attesters.contains(&new_attester.id().to_string()));
    
    Ok(())
}

#[tokio::test]
async fn test_acl_revoke_role() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, dao, attester1, _attester2) = setup_contract().await?;
    
    let outcome = dao
        .call(contract.id(), "acl_revoke_role")
        .args_json(json!({
            "role": "Attester",
            "account_id": attester1.id()
        }))
        .transact()
        .await?;
    assert!(outcome.is_success());
    
    let attesters: Vec<String> = contract
        .view("get_attesters")
        .args_json(json!({"from_index": 0, "limit": 10}))
        .await?.json()?;
    assert_eq!(attesters.len(), 1);
    assert!(!attesters.contains(&attester1.id().to_string()));
    
    Ok(())
}

#[tokio::test]
async fn test_acl_has_role() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, _attester2) = setup_contract().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let non_attester = sandbox.dev_create_account().await?;
    
    let has_role: bool = contract
        .view("acl_has_role")
        .args_json(json!({
            "role": "Attester",
            "account_id": attester1.id()
        }))
        .await?
        .json()?;
    assert!(has_role);
    
    let has_role: bool = contract
        .view("acl_has_role")
        .args_json(json!({
            "role": "Attester",
            "account_id": non_attester.id()
        }))
        .await?
        .json()?;
    assert!(!has_role);
    
    Ok(())
}

#[tokio::test]
async fn test_get_attestation() -> Result<(), Box<dyn std::error::Error>> {
    let (_sandbox, contract, _dao, attester1, attester2) = setup_contract().await?;
    
    let public_keys = vec![json!({"n": [1, 2, 3], "e": [4, 5, 6]})];
    
    let _ = attester1
        .call(contract.id(), "attest_keys")
        .args_json(json!({"public_keys": public_keys}))
        .transact()
        .await?;
    
    // Should have attestation for attester1
    let attestation: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester1.id()}))
        .await?
        .json()?;
    assert!(attestation.is_some());
    
    // Should NOT have attestation for attester2
    let attestation: Option<serde_json::Value> = contract
        .view("get_attestation")
        .args_json(json!({"account_id": attester2.id()}))
        .await?
        .json()?;
    assert!(attestation.is_none());
    
    Ok(())
}

#[tokio::test]
async fn test_quorum_of_one() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    
    let dao = sandbox.dev_create_account().await?;
    let attester = sandbox.dev_create_account().await?;
    
    // Initialize with quorum of 1
    let _ = dao
        .call(contract.id(), "new")
        .args_json(json!({
            "quorum": 1,
            "super_admins": [dao.id()],
            "attesters": [attester.id()]
        }))
        .transact()
        .await?;
    
    let public_keys = vec![json!({"n": [1, 2, 3], "e": [4, 5, 6]})];
    
    let _ = attester
        .call(contract.id(), "attest_keys")
        .args_json(json!({"public_keys": public_keys}))
        .transact()
        .await?;
    
    // Should immediately set public keys with quorum of 1
    let public_keys_result: Vec<serde_json::Value> = contract.view("get_public_keys").await?.json()?;
    assert_eq!(public_keys_result.len(), 1);
    
    Ok(())
}

// Helper function to setup a contract with standard configuration
async fn setup_contract() -> Result<
    (
        near_workspaces::Worker<near_workspaces::network::Sandbox>,
        near_workspaces::Contract,
        near_workspaces::Account,
        near_workspaces::Account,
        near_workspaces::Account,
    ),
    Box<dyn std::error::Error>,
> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    
    let dao = sandbox.dev_create_account().await?;
    let attester1 = sandbox.dev_create_account().await?;
    let attester2 = sandbox.dev_create_account().await?;
    
    let _ = dao
        .call(contract.id(), "new")
        .args_json(json!({
            "quorum": 2,
            "super_admins": [dao.id()],
            "attesters": [attester1.id(), attester2.id()]
        }))
        .transact()
        .await?;
    
    Ok((sandbox, contract, dao, attester1, attester2))
}

