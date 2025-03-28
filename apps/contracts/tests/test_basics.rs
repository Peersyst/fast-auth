use serde_json::json;

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
        .args_json(json!({"token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQzMDc2ODgzLCJleHAiOjE3NDMxNjMyODMsInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.Te6oeqYMim8OuKiO55qH26dUPaZXKg4OgQAJlxnw57lXj7drT9vct5tLQzzl6SV2v-Asb9n9XJGxnnLX21X8m2yBXJk_6PPGzE5kpmOw7DQ9nUckHN1itS4UHCZWh7LY0D2Ck0cdi1Vzb8UnnictzTUCQ20Geb07FtRkTq6HEtGd1YkfdJyYGXalWdJOjTxb70E-pnzbFyLuM7RZ9Y3WEwpQWEbAQ0J2cm0CrG_iQHlMNJmrL-mGvQCTvPykvgF33KafpVglhAB7WiqIVt477-VjusCdSsxlsXJYlAip0n0dyhlov-YGflLQ_dFJ9kg5V1bHU0mVaAoewyRF9F3MNA", "expected_sub": "google-oauth2|115231002714067847027", "expected_aud": ["https://fast-auth-poc.com", "https://dev-gb1h5yrepb85jstz.us.auth0.com/userinfo"]}))
        .transact()
        .await?;

    println!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    // let user_message_outcome = contract.view("get_greeting").args_json(json!({})).await?;
    // assert_eq!(user_message_outcome.json::<String>()?, "Hello World!");

    Ok(())
}
