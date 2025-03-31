use near_sdk::serde_json::json;

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let contract_wasm = near_workspaces::compile_project("./").await?;

    test_basics_on(&contract_wasm).await?;
    Ok(())
}

async fn test_basics_on(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;

    println!("contract: {:?}", contract);

    let user_account = sandbox.dev_create_account().await?;
    println!("user_account: {:?}", user_account);

    let outcome = user_account
        .call(contract.id(), "verify_jwt")
        .args_json(json!({"token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQzNDA1OTA3LCJleHAiOjE3NDM0OTIzMDcsInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.TIb8G8BYb9u4xXRBPx13haXtpDSFgH_ka4xEx8YaLjLlR9k19UnQhHAGQrhAg6yFQoIMIUCacRrqcgBCCKCIaDl4832mqdcOmRMrpTcsvEgBGRB1Sw9tADc9By0TNG-StCU2XZQha5dquLn4pGT1icH52s2MsGNxBe9zzQbORdvHSK2vVLJ_KYn1OcVuomx178hSu4KJEdNKLdCaBrxdzp-54N8TYlqJgx7CczNgaOdgr02hRMDQOkcD4gPVuVBTESGvpJmjnZrlAOmvi3ORgz5fciqiPFWGMK8NmUVEeiUoJXRqkyv0PZH3YQgObOzp795C8footYXHQscy2USAug", "expected_sub": "google-oauth2|115231002714067847027", "expected_aud": ["https://fast-auth-poc.com", "https://dev-gb1h5yrepb85jstz.us.auth0.com/userinfo"]}))
        .transact()
        .await?;

    println!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    // let user_message_outcome = contract.view("get_greeting").args_json(json!({})).await?;
    // assert_eq!(user_message_outcome.json::<String>()?, "Hello World!");

    Ok(())
}
