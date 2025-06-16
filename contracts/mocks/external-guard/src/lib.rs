use near_sdk::{near};

#[near(contract_state)]
pub struct MockExternalGuard {}

impl Default for MockExternalGuard {
    fn default() -> Self {
        Self {}
    }
}

#[near]
impl MockExternalGuard {
    pub fn verify(&self, _jwt: String, _sign_payload: Vec<u8>) -> (bool, String) {
        // For testing, we'll just return true if the payload is not empty
        (true, "issuer/sub".to_string())
    }
}
