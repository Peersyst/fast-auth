use near_sdk::serde_json::json;

#[tokio::test]
async fn test_verify_signature_should_pass() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // NOTE: Replace with actual public key components
    let n = vec![];
    let e = vec![];
    // NOTE: Replace with actual JWT token
    let token = "".to_string();
    // NOTE: Replace with actual sign payload
    let sign_payload = vec![];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "n_component": n,
            "e_component": e
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "jwt": token,
            "sign_payload": sign_payload
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());
    
    Ok(())
}

#[tokio::test]
async fn test_verify_signature_should_fail_invalid_pk() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // NOTE: Replace with actual public key components
    let n = vec![];
    let e = vec![];
    // NOTE: Replace with actual JWT token
    let token = "".to_string();
    // NOTE: Replace with actual sign payload
    let sign_payload = vec![];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "n_component": n,
            "e_component": e
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "jwt": token,
            "sign_payload": sign_payload
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_verify_signature_should_fail_invalid_token() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // NOTE: Replace with actual public key components
    let n = vec![];
    let e = vec![];
    // NOTE: Replace with actual JWT token
    let token = "".to_string();
    // NOTE: Replace with actual sign payload
    let sign_payload = vec![];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "n_component": n,
            "e_component": e
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "jwt": token,
            "sign_payload": sign_payload
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok(())
}


async fn test_verify_signature_should_fail_invalid_sign_payload() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // NOTE: Replace with actual public key components
    let n = vec![];
    let e = vec![];
    // NOTE: Replace with actual JWT token
    let token = "".to_string();
    // NOTE: Replace with actual sign payload
    let sign_payload = vec![];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "n_component": n,
            "e_component": e
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "jwt": token,
            "sign_payload": sign_payload
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok(())
}