use near_sdk::{near};

#[near(contract_state)]
pub struct MockJwtImplementation {}

impl Default for MockJwtImplementation {
    fn default() -> Self {
        Self {}
    }
}

#[near]
impl MockJwtImplementation {
    pub fn verify_signature(&self, _n: Vec<u8>, _e: Vec<u8>, token: String) -> bool {
        // For testing, we'll just return true if the payload is not empty
        !token.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify() {
        let contract = MockJwtImplementation::default();
        assert!(contract.verify_signature(vec![], vec![], "test".to_string()));
        assert!(!contract.verify_signature(vec![], vec![], "".to_string()));
    }
} 