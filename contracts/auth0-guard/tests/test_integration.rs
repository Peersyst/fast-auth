use near_sdk::serde_json::json;

#[tokio::test]
async fn test_verify_signature_should_pass() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    // Create the arrays separately to avoid JSON macro recursion issues
    let n = vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215];
    let e = vec![1, 0, 1];
    let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJmYXAiOiJwZXJtaXNzaW9ucyIsImlzcyI6Imh0dHBzOi8vZGV2LWdiMWg1eXJlcGI4NWpzdHoudXMuYXV0aDAuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTE1MjMxMDAyNzE0MDY3ODQ3MDI3IiwiYXVkIjpbImh0dHBzOi8vZmFzdC1hdXRoLXBvYy5jb20iLCJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NDQzNjU2NzAsImV4cCI6MTc0NDQ1MjA3MCwic2NvcGUiOiJvcGVuaWQgdHJhbnNhY3Rpb246c2VuZC10cmFuc2FjdGlvbiIsImF6cCI6IjdEbWhXdXVnVVZKRE5TSjRlZE5PVEZtMGM5OHhzOWhwIn0.bUbBnZxqfugUNv64wYt6kVmKuySbFrVO_Xlj8YrjsZk_N9fZw0-wCXfFkxVKmQUfbqqbgczqhHwPZVrC8_9COq21qwBtZCxMQOjLSRZhM0Y8CmDpugY8f5bFExoHeeXgvXWh0DCKmtU90PNKr4OxEqD25V71s8X2uiAqwClcxwIPYiIYTukK_MR7tuf9WR4ixc6eV-av5ui2XenQn_fIWITFfJfc5m_0WO3X5jWGD4JtO9dYFSJGMnYH3r5A6myHkj9vPNusTU92KXmMwhDi6U-CxYzWpY_pAfnV1Aj9BQE1Oo15ymrpaKMkqhzjMOehKS3MTomJin6pX1ujmis9TA".to_string();
    let sign_payload = vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "issuer": "https://dev-gb1h5yrp85jsty.us.auth0.com/",
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

    // Create the arrays separately to avoid JSON macro recursion issues
    let n = vec![182, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215];
    let e = vec![1, 0, 1];
    let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAQ".to_string();
    let sign_payload = vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "issuer": "https://dev-gb1h5yrp85jsty.us.auth0.com/",
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

    // Create the arrays separately to avoid JSON macro recursion issues
    let n = vec![183, 68, 77, 78, 175, 25, 252, 16, 216, 124, 221, 80, 120, 196, 71, 60, 217, 168, 127, 211, 193, 143, 212, 221, 57, 61, 224, 49, 146, 77, 41, 83, 74, 185, 254, 100, 120, 138, 37, 171, 214, 128, 143, 107, 242, 123, 27, 11, 186, 161, 231, 36, 239, 230, 18, 23, 244, 255, 255, 65, 242, 40, 250, 103, 235, 139, 53, 99, 79, 157, 218, 194, 243, 176, 11, 44, 126, 122, 36, 199, 226, 5, 166, 173, 251, 161, 100, 148, 19, 233, 97, 115, 206, 145, 122, 128, 11, 246, 62, 44, 131, 12, 182, 70, 33, 122, 16, 96, 118, 248, 163, 185, 204, 246, 108, 96, 214, 227, 25, 219, 46, 66, 15, 132, 109, 138, 184, 135, 104, 160, 237, 110, 124, 79, 193, 102, 202, 76, 90, 170, 147, 136, 184, 76, 84, 153, 195, 80, 186, 83, 225, 157, 87, 56, 150, 61, 48, 114, 73, 247, 217, 177, 237, 249, 121, 205, 58, 205, 78, 195, 4, 159, 50, 74, 224, 238, 224, 137, 151, 8, 248, 46, 80, 185, 9, 50, 162, 192, 195, 84, 97, 29, 64, 111, 54, 228, 219, 65, 21, 104, 154, 105, 84, 119, 148, 92, 251, 225, 201, 36, 36, 223, 157, 9, 178, 93, 235, 64, 201, 144, 56, 12, 222, 61, 236, 100, 118, 51, 51, 129, 231, 220, 16, 109, 180, 57, 192, 86, 91, 126, 162, 251, 204, 35, 79, 34, 0, 127, 134, 142, 192, 82, 222, 95, 162, 215];
    let e = vec![1, 0, 1];
    let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQ0MTkwMDI5LCJleHAiOjE3NDQyNzY0MjksInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.oG403pM7mp_nrnzfr7KpYOm2f7DtoKgUQO3F83-UEH1OdI2oaQNa4fGsB_wePjkOBTXeL_H7-2mx7fDUhhvVvCb1sAyJsfL7y6tqTfBXY3u3l-qZdDPzFmDnzj-se5UU5N9qFM9sUQo8ZpvGbi0hF6APgO_0HQox1sverUvtnpnoJK1JxkrVd0q2njDV5ImB8XzUC9r0xh2GlRTXPOnKJYmX5H-n0i921cTUFRRB0IFSv_9dRyJUZpkfkCgmfMiTd_NVa-JWNwsTNzl-1ZTFynE8LJ4zEnTfaPRDCaucGYO5hIvfhpOg2zQf3BgXcnF3BGy3a8_iPypCpUb3f87oAY".to_string();
    let sign_payload = vec![18,0,0,0,102,97,45,103,117,105,108,108,101,109,46,116,101,115,116,110,101,116,1,39,120,2,50,42,247,243,223,152,97,251,28,153,38,154,132,184,123,152,150,247,216,87,53,76,42,127,19,128,8,182,209,251,27,180,20,37,185,247,35,6,71,31,96,110,66,121,105,228,25,250,206,183,191,36,109,75,105,97,29,40,142,8,244,92,41,186,126,86,111,0,0,20,0,0,0,98,111,115,105,115,116,104,101,110,101,97,114,46,116,101,115,116,110,101,116,52,21,83,75,220,170,104,179,136,244,168,118,25,92,224,68,131,152,152,41,245,193,229,182,8,136,86,237,141,217,157,155,1,0,0,0,3,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "issuer": "https://dev-gb1h5yrp85jsty.us.auth0.com/",
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
async fn test_set_issuer_should_succeed() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let user_account = sandbox.dev_create_account().await?;

    // Initialize contract
    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "issuer": "https://old-issuer.com/",
            "n_component": vec![1, 2, 3],
            "e_component": vec![1, 0, 1]
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    // Set new issuer
    let outcome = user_account
        .call(contract.id(), "set_issuer")
        .args_json(json!({
            "issuer": "https://new-issuer.com/"
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    // Verify the issuer was updated
    let result = user_account
        .view(contract.id(), "get_issuer")
        .args_json(json!({}))
        .await?;

    let issuer: String = result.json()?;
    assert_eq!(issuer, "https://new-issuer.com/");

    Ok(())
}

#[tokio::test]
async fn test_set_issuer_should_fail_non_owner() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let owner_account = sandbox.dev_create_account().await?;
    let non_owner_account = sandbox.dev_create_account().await?;

    // Initialize contract with owner
    let outcome = owner_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": owner_account.id(),
            "issuer": "https://old-issuer.com/",
            "n_component": vec![1, 2, 3],
            "e_component": vec![1, 0, 1]
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    // Try to set issuer with non-owner account
    let outcome = non_owner_account
        .call(contract.id(), "set_issuer")
        .args_json(json!({
            "issuer": "https://new-issuer.com/"
        }))
        .transact()
        .await?;

    // Should fail because non-owner cannot call set_issuer
    assert!(!outcome.is_success());

    // Verify the issuer was not changed
    let result = owner_account
        .view(contract.id(), "get_issuer")
        .args_json(json!({}))
        .await?;

    let issuer: String = result.json()?;
    assert_eq!(issuer, "https://old-issuer.com/");

    Ok(())
}

#[tokio::test]
async fn test_get_issuer_should_return_current_issuer() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let user_account = sandbox.dev_create_account().await?;
    let expected_issuer = "https://test-issuer.com/";

    // Initialize contract
    let outcome = user_account
        .call(contract.id(), "init")
        .args_json(json!({
            "owner": user_account.id(),
            "issuer": expected_issuer,
            "n_component": vec![1, 2, 3],
            "e_component": vec![1, 0, 1]
        }))
        .transact()
        .await?;

    assert!(outcome.is_success());

    // Get the issuer
    let result = user_account
        .view(contract.id(), "get_issuer")
        .args_json(json!({}))
        .await?;

    let issuer: String = result.json()?;
    assert_eq!(issuer, expected_issuer);

    Ok(())
}


