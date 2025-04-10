use serde_json::json;
use fa_permissions::permission::FaPermission;

#[tokio::test]
async fn test_owner() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let owner = sandbox.dev_create_account().await?;
    let permissions_manager = sandbox.dev_create_account().await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id(),
            "permissions_manager": permissions_manager.id()
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
async fn test_permissions_manager() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let owner = sandbox.dev_create_account().await?;
    let permissions_manager = sandbox.dev_create_account().await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id(),
            "permissions_manager": permissions_manager.id()
        }))
        .transact()
        .await?;

    // Test getting the permissions manager
    let permissions_manager_outcome = contract
        .call("permissions_manager")
        .view()
        .await?;
    assert_eq!(permissions_manager_outcome.json::<String>()?, permissions_manager.id().to_string());

    // Test changing the permissions manager
    let new_permissions_manager = sandbox.dev_create_account().await?;
    let change_permissions_manager_outcome = owner.call(contract.id(), "change_permissions_manager")
        .args_json(json!({
            "new_permissions_manager": new_permissions_manager.id()
        }))
        .transact()
        .await?;
    assert!(change_permissions_manager_outcome.is_success());

    Ok(())
}


#[tokio::test]
async fn test_user_permissions() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let owner = sandbox.dev_create_account().await?;
    let permissions_manager = sandbox.dev_create_account().await?;
    let user = sandbox.dev_create_account().await?;

    // Initialize contract with owner and permissions manager
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id(),
            "permissions_manager": permissions_manager.id()
        }))
        .transact()
        .await?;

    // Test adding permissions for a user by permissions manager
    let permission = FaPermission::new("test_permission".to_string());
    let add_permissions_outcome = permissions_manager.call(contract.id(), "add_permissions_to_user")
        .args_json(json!({
            "user": user.id().to_string(),
            "permissions": vec![permission.clone()]
        }))
        .transact()
        .await?;
    assert!(add_permissions_outcome.is_success());

    // Test getting user permissions
    let user_permissions = contract.call("get_permissions_for_user")
        .args_json(json!({
            "user": user.id().to_string()
        }))
        .view()
        .await?;
    let permissions: Vec<FaPermission> = user_permissions.json()?;
    assert_eq!(permissions.len(), 1);
    assert_eq!(permissions[0].name, "test_permission");

    // Test removing permissions
    let remove_permissions_outcome = permissions_manager.call(contract.id(), "remove_permissions_from_user")
        .args_json(json!({
            "user": user.id().to_string(),
            "permissions": vec![permission.clone()]
        }))
        .transact()
        .await?;
    assert!(remove_permissions_outcome.is_success());

    // Verify permissions were removed
    let user_permissions = contract.call("get_permissions_for_user")
        .args_json(json!({
            "user": user.id().to_string()
        }))
        .view()
        .await?;
    let permissions: Vec<FaPermission> = user_permissions.json()?;
    assert_eq!(permissions.len(), 0);

    // Test that non-permissions manager cannot add permissions
    let non_manager = sandbox.dev_create_account().await?;
    let unauthorized_add = non_manager.call(contract.id(), "add_permissions_to_user")
        .args_json(json!({
            "user": user.id().to_string(),
            "permissions": vec![permission.clone()]
        }))
        .transact()
        .await?;
    assert!(!unauthorized_add.is_success());

    Ok(())
}
