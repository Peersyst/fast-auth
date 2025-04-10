use near_sdk::ext_contract;

// Validator interface, for cross-contract calls
#[ext_contract(external_guard)]
pub trait ExternalGuard {
    fn verify(&self, payload: String) -> (bool, String, String);
}