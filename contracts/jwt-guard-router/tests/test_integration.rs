use serde_json::json;
use near_sdk::NearToken;

// NOTE: 1.5 NEAR for testing purposes
const REQUIRED_DEPOSIT: u128 = 1_500_000_000_000_000_000_000_000;

#[tokio::test]
async fn test_add_guard() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let adder = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id(),
            "guards": {}
        }))
        .transact()
        .await?;

    // Add a guard without no deposit
    let mut outcome = adder.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_name": "jwt",
            "guard_account": "jwt.fast-auth.near"
        }))
        .transact()
        .await?;

    assert!(!outcome.is_success());

    // Add a guard with not enough deposit
    outcome = adder.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_name": "jwt",
            "guard_account": "jwt.fast-auth.near"
        }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;

    assert!(!outcome.is_success());

    // Add a guard with enough deposit
    outcome = adder.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_name": "jwt",
            "guard_account": "jwt.fast-auth.near"
        }))
        .deposit(NearToken::from_yoctonear(REQUIRED_DEPOSIT))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    // Get the guard
    let guard_outcome = contract.call("get_guard")
        .args_json(json!({
            "guard_name": "jwt"
        }))
        .view()
        .await?;

    assert_eq!(guard_outcome.json::<String>()?, "jwt.fast-auth.near");

    // Try to add the same guard again (should fail)
    outcome = adder.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_name": "jwt",
            "guard_account": "jwt.fast-auth.near"
        }))
        .transact()
        .await?;
    
    assert!(!outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_remove_guard() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let sandbox = near_workspaces::sandbox().await?;
    let owner = sandbox.dev_create_account().await?;
    let not_owner = sandbox.dev_create_account().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    // Initialize contract with owner
    let _ = contract.call("init")
        .args_json(json!({
            "owner": owner.id(),
        }))
        .transact()
        .await?;


    // Add a guard without no deposit
    let mut outcome = not_owner.call(contract.id(), "add_guard")
        .args_json(json!({
            "guard_name": "jwt",
            "guard_account": "jwt.fast-auth.near"
        }))
        .deposit(NearToken::from_yoctonear(REQUIRED_DEPOSIT))
        .transact()
        .await?;

    assert!(outcome.is_success());

    // Try to remove the guard as not owner (should fail)
    let outcome = not_owner.call(contract.id(), "remove_guard")
        .args_json(json!({
            "guard_name": "jwt"
        }))
        .transact()
        .await?;

    assert!(!outcome.is_success());

    // Remove the guard as owner
    let outcome = owner.call(contract.id(), "remove_guard")
        .args_json(json!({
            "guard_name": "jwt"
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    Ok(())
}

// #[tokio::test]
// async fn test_verify() -> Result<(), Box<dyn std::error::Error>> {
//     let contract_wasm = near_workspaces::compile_project("./").await?;

    
//     let sandbox = near_workspaces::sandbox().await?;
//     let mock_guard = sandbox.dev_deploy(include_bytes!("../target/wasm32-unknown-unknown/release/external_guard.wasm")).await?;
//     let owner = sandbox.dev_create_account().await?;
//     let contract = sandbox.dev_deploy(&contract_wasm).await?;

//     // Initialize contract with owner
//     let _ = contract.call("init")
//         .args_json(json!({
//             "owner": owner.id(),
//         }))
//         .transact()
//         .await?;

//     // Add a guard
//     let outcome = contract.call("add_guard")
//         .args_json(json!({
//             "guard_name": "test-guard",
//             "guard_account": mock_guard.id()
//         }))
//         .deposit(NearToken::from_yoctonear(REQUIRED_DEPOSIT))
//         .transact()
//         .await?;

//     assert!(outcome.is_success());

//     // Call verify with invalid type
//     let outcome = contract.call("verify")
//         .args_json(json!({
//             "ty": "test-guard",
//             "jwt": "test.jwt.token",
//             "sign_payload": vec![1, 2, 3]
//         }))
//         .transact()
//         .await?;

//     assert!(!outcome.is_success());

//     // Call verify
//     let outcome = contract.call("verify")
//         .args_json(json!({
//             "ty": "jwt/test-guard",
//             "jwt": "test.jwt.token",
//             "sign_payload": vec![1, 2, 3]
//         }))
//         .transact()
//         .await?;

//     println!("outcome: {:?}", outcome);
//     assert!(outcome.is_success());

//     Ok(())
// }
