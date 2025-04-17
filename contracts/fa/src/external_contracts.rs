use near_sdk::ext_contract;

// Guard interface, for cross-contract calls
#[ext_contract(external_guard)]
pub trait ExternalGuard {
    fn verify(&self, jwt: String) -> (bool, String, String);
}