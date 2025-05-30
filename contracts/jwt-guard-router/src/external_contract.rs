use near_sdk::ext_contract;

// Guard interface, for cross-contract calls
#[ext_contract(jwt_guard)]
pub trait JwtGuard {
    fn verify(&self, jwt: String, sign_payload: Vec<u8>) -> (bool, String);
}
