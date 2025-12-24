use near_sdk::base64;
use near_sdk::base64::Engine;
use near_sdk::env::sha256;
use near_sdk::serde_json::json;
use near_workspaces::{Account, Contract};
use jwt_guard::JwtPublicKey;

async fn deploy_contract() -> Result<(Account, Contract), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // Create a mock attestation contract account for testing
    let attestation_contract_account = sandbox.dev_create_account().await?;
    println!("attestation_contract_account: {:?}", attestation_contract_account);

    // Create the public key
    let public_keys = vec![JwtPublicKey {
        n: vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215],
        e: vec![1, 0, 1],
    }];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "config": {
                "issuer": "https://dev-gb1h5yrp85jsty.us.auth0.com/",
                "public_keys": public_keys,
                "roles": {
                    "super_admins": [user_account.id()],
                    "admins": {},
                    "grantees": {},
                },
            },
            "attestation_contract": attestation_contract_account.id()
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok((user_account, contract))
}

async fn storage_deposit(user_account: &Account, contract: &Contract) -> Result<(), Box<dyn std::error::Error>> {
    let outcome = user_account
        .call(contract.id(), "storage_deposit")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "account_id": user_account.id()
        }))
        .deposit(near_sdk::NearToken::from_millinear(2))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_claim_oidc_unregistered_should_fail() -> Result<(), Box<dyn std::error::Error>> {
    let (user_account, contract) = deploy_contract().await?;
    let outcome = user_account
        .call(contract.id(), "claim_oidc")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "oidc_token_hash": vec![0u8; 32]
        }))
        .transact()
        .await?;

    let error_result = outcome.into_result();
    let error_message = format!("{:#?}", error_result.unwrap_err());
    assert!(
        error_message.contains(&format!("The account {} is not registered", user_account.id())),
        "Expected claim error but got: {}",
        error_message
    );
    
    Ok(())
}

#[tokio::test]
async fn test_claim_oidc_invalid_hash_should_fail() -> Result<(), Box<dyn std::error::Error>> {
    let (user_account, contract) = deploy_contract().await?;
    let outcome = user_account
        .call(contract.id(), "claim_oidc")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "oidc_token_hash": vec![0u8; 1]
        }))
        .transact()
        .await?;

    let error_result = outcome.into_result();
    let error_message = format!("{:#?}", error_result.unwrap_err());
    assert!(
        error_message.contains("OIDC token hash must be 32 bytes"),
        "Expected claim error but got: {}",
        error_message
    );

    Ok(())
}

#[tokio::test]
async fn test_claim_oidc_should_pass() -> Result<(), Box<dyn std::error::Error>> {
    let (user_account, contract) = deploy_contract().await?;
    storage_deposit(&user_account, &contract).await?;

    let outcome = user_account
        .call(contract.id(), "claim_oidc")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "oidc_token_hash": vec![1u8; 32]
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "jwt_claim_of")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "account_id": user_account.id(),
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    let result = outcome.into_result();
    let result_value = format!("{:#?}", result.unwrap());
    assert!(result_value.contains("[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]"));

    Ok(())
}

#[tokio::test]
async fn test_verify_should_pass() -> Result<(), Box<dyn std::error::Error>> {
    let (user_account, contract) = deploy_contract().await?;
    storage_deposit(&user_account, &contract).await?;

    let token_payload = "eyJmYXAiOiJwZXJtaXNzaW9ucyIsImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTE1MjMxMDAyNzE0MDY3ODQ3MDI3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDQzNjU2NzAsImV4cCI6MTc0NDQ1MjA3MCwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0".to_string();
    let token = format!("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.{}.bUbBnZxqfugUNv64wYt6kVmKuySbFrVO_Xlj8YrjsZk_N9fZw0-wCXfFkxVKmQUfbqqbgczqhHwPZVrC8_9COq21qwBtZCxMQOjLSRZhM0Y8CmDpugY8f5bFExoHeeXgvXWh0DCKmtU90PNKr4OxEqD25V71s8X2uiAqwClcxwIPYiIYTukK_MR7tuf9WR4ixc6eV-av5ui2XenQn_fIWITFfJfc5m_0WO3X5jWGD4JtO9dYFSJGMnYH3r5A6myHkj9vPNusTU92KXmMwhDi6U-CxYzWpY_pAfnV1Aj9BQE1Oo15ymrpaKMkqhzjMOehKS3MTomJin6pX1ujmis9TA", token_payload).to_string();

    let token_payload_bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(token_payload.as_bytes()) {
        Ok(bytes) => bytes,
        Err(_) => panic!("Failed to decode token payload"),
    };

    let outcome = user_account
        .call(contract.id(), "claim_oidc")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "oidc_token_hash": sha256(token_payload_bytes.clone())
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    near_sdk::log!("sha256: {:?}", sha256(token_payload_bytes));
    assert!(outcome.is_success());

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "issuer": "https://dev-gb1h5yrepb85jstz.us.auth0.com/".to_string(),
            "jwt": token,
            "sign_payload": vec![0],
            "predecessor": user_account.id(),
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    Ok(())
}

#[tokio::test]
async fn test_verify_unclaimed_token_should_fail() -> Result<(), Box<dyn std::error::Error>> {
    let (user_account, contract) = deploy_contract().await?;
    storage_deposit(&user_account, &contract).await?;

    let token_payload = "eyJmYXAiOiJwZXJtaXNzaW9ucyIsImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTE1MjMxMDAyNzE0MDY3ODQ3MDI3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDQzNjU2NzAsImV4cCI6MTc0NDQ1MjA3MCwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0".to_string();
    let token = format!("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.{}.bUbBnZxqfugUNv64wYt6kVmKuySbFrVO_Xlj8YrjsZk_N9fZw0-wCXfFkxVKmQUfbqqbgczqhHwPZVrC8_9COq21qwBtZCxMQOjLSRZhM0Y8CmDpugY8f5bFExoHeeXgvXWh0DCKmtU90PNKr4OxEqD25V71s8X2uiAqwClcxwIPYiIYTukK_MR7tuf9WR4ixc6eV-av5ui2XenQn_fIWITFfJfc5m_0WO3X5jWGD4JtO9dYFSJGMnYH3r5A6myHkj9vPNusTU92KXmMwhDi6U-CxYzWpY_pAfnV1Aj9BQE1Oo15ymrpaKMkqhzjMOehKS3MTomJin6pX1ujmis9TA", token_payload).to_string();

    let outcome = user_account
        .call(contract.id(), "verify")
        .gas(near_sdk::Gas::from_tgas(300))
        .args_json(json!({
            "issuer": "https://dev-gb1h5yrepb85jstz.us.auth0.com/".to_string(),
            "jwt": token,
            "sign_payload": vec![0],
            "predecessor": user_account.id(),
        }))
        .transact()
        .await?;

    near_sdk::log!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    let result = outcome.into_result();
    let result_value = format!("{:#?}", result.unwrap());
    assert!(result_value.contains("not matching hash"));

    Ok(())
}
