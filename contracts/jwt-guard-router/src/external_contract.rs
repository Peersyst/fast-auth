use near_sdk::{ext_contract, AccountId};

// Guard interface, for cross-contract calls
#[ext_contract(jwt_guard)]
pub trait JwtGuard {
    fn verify(&self, jwt: String, sign_payload: Vec<u8>, predecessor: AccountId) -> (bool, String);
}
