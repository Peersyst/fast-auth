use near_sdk::ext_contract;

#[ext_contract(jwt_algorithm)]
pub trait JwtAlgorithm {    
    fn verify_signature(&self, n: Vec<u8>, e: Vec<u8>, token: String) -> bool;
}

