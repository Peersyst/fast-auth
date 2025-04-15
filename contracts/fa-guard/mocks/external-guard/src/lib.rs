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
    pub fn verify(&self, _payload: String) -> (bool, String, String) {
        // For testing, we'll just return true if the payload is not empty
        (true, "user".to_string(), "permissions".to_string())
    }
}
