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

    // Create the arrays separately to avoid JSON macro recursion issues
    let hashed = vec![113, 123, 200, 51, 146, 222, 185, 141, 194, 14, 33, 223, 194, 11, 150, 250, 99, 134, 239, 227, 61, 63, 43, 142, 18, 215, 31, 133, 207, 85, 242, 141];
    let signature_bytes = vec![56, 0, 134, 43, 184, 82, 82, 226, 61, 123, 207, 189, 253, 2, 226, 48, 214, 199, 91, 253, 202, 40, 40, 203, 245, 116, 151, 186, 123, 187, 122, 223, 45, 29, 51, 64, 171, 164, 34, 128, 190, 254, 122, 53, 16, 140, 78, 234, 104, 25, 142, 2, 167, 74, 111, 157, 86, 194, 250, 190, 180, 11, 3, 24, 46, 124, 28, 0, 215, 0, 176, 200, 6, 21, 167, 116, 52, 111, 41, 17, 67, 40, 75, 248, 240, 5, 244, 153, 132, 131, 200, 0, 23, 0, 139, 73, 12, 235, 130, 102, 3, 81, 13, 221, 169, 214, 134, 129, 225, 173, 242, 171, 130, 158, 146, 241, 253, 130, 206, 202, 236, 156, 60, 182, 21, 114, 253, 234, 40, 179, 89, 49, 53, 166, 37, 136, 157, 179, 43, 140, 16, 212, 39, 131, 48, 131, 49, 105, 63, 40, 43, 171, 147, 151, 77, 10, 219, 151, 121, 183, 108, 5, 198, 15, 197, 155, 221, 113, 33, 232, 205, 224, 42, 229, 192, 211, 244, 151, 130, 254, 9, 108, 85, 130, 1, 193, 209, 4, 160, 198, 33, 215, 93, 110, 88, 30, 99, 115, 170, 249, 108, 57, 159, 145, 70, 139, 188, 163, 183, 20, 172, 186, 37, 73, 152, 131, 191, 16, 2, 93, 190, 56, 44, 20, 60, 188, 86, 33, 198, 167, 152, 195, 225, 4, 228, 112, 10, 189, 228, 125, 185, 211, 161, 187, 71, 221, 251, 235, 141, 52, 97, 51, 100, 87, 209, 61];

    let outcome = user_account
        .call(contract.id(), "verify_jwt")
        .args_json(json!({
            "hashed": hashed,
            "signature_bytes": signature_bytes
        }))
        .transact()
        .await?;

    println!("outcome: {:?}", outcome);
    assert!(outcome.is_success());

    // let user_message_outcome = contract.view("get_greeting").args_json(json!({})).await?;
    // assert_eq!(user_message_outcome.json::<String>()?, "Hello World!");

    Ok(())
}
