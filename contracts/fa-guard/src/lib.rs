// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseResult, AccountId, Gas, NearToken};
use std::collections::HashMap;
use near_sdk::serde_json::json;

// Define the contract structure
#[near(contract_state)]
pub struct FaGuard{
    guards: HashMap<String, AccountId>,
}

// Define the default, which automatically initializes the contract
impl Default for FaGuard {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
        }
    }
}

const NO_DEPOSIT: NearToken = NearToken::from_yoctonear(0);
// TODO: Hardcoded gas for now, should be dynamic
const GAS_FOR_VERIFY: Gas = Gas::from_gas(5_000_000_000_000);

// Implement the contract structure
#[near]
impl FaGuard {

    #[init]
    #[private]
    pub fn init(init_guards: HashMap<String, AccountId>) -> Self {
        Self {
            guards: init_guards,
        }
    }

    // FaGuard Guard methods

    // Public method - returns the guard saved, defaulting to DEFAULT_GUARD
    pub fn get_guard(&self, guard_id: String) -> AccountId {
        self.guards.get(&guard_id).unwrap().clone()
    }

    // Public method - accepts a guard_id and guard_address, and records it
    #[private]
    pub fn add_guard(&mut self, guard_id: String, guard_address: AccountId) {
        log!("Saving guard: {guard_id}");
        self.guards.insert(guard_id, guard_address);
    }

    // Public method - accepts a guard_id, and removes it
    #[private]
    pub fn remove_guard(&mut self, guard_id: String) {
        log!("Removing guard: {guard_id}");
        self.guards.remove(&guard_id);
    }

    // Public method - accepts a guard_id and payload, and verifies the guard
    pub fn verify(&self, guard_id: String, payload: String) -> Promise {
        let guard_address = self.get_guard(guard_id);
        let args = json!({
            "payload": payload
        }).to_string().into_bytes().to_vec();
        Promise::new(guard_address).function_call("verify".to_string(), args, NO_DEPOSIT, GAS_FOR_VERIFY)
        .then(Promise::new(env::current_account_id())
            .function_call(
                "on_verify_callback".to_string(),
                Vec::new(),
                NO_DEPOSIT,
                // TODO: Hardcoded gas for now, should be dynamic
                Gas::from_gas(2_000_000_000_000),
            )
        )
    }

    #[private]
    pub fn on_verify_callback(&self) -> bool {
        match env::promise_result(0) {
            PromiseResult::Successful(data) => {
                if let Ok(result) = near_sdk::serde_json::from_slice::<bool>(&data) {
                    result
                } else {
                    false
                }
            },
            PromiseResult::Failed => {
                log!("Guard verification failed");
                false
            },
        }
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_existing_guard() {
        let addr: AccountId = "jwt.fast-auth.near".parse().unwrap();
        let contract = FaGuard { guards: HashMap::from([("jwt".to_string(), addr.clone())]) };
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn get_non_existing_guard() {
        let contract = FaGuard::default();
        contract.get_guard("jwt".to_string());
    }

    #[test]
    fn add_guard() {
        let mut contract = FaGuard::default();
        let addr: AccountId = "jwt.fast-auth.near".parse().unwrap();
        contract.add_guard("jwt".to_string(), addr.clone());
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn remove_guard() {
        let addr: AccountId = "jwt.fast-auth.near".parse().unwrap();
        let mut contract = FaGuard { guards: HashMap::from([("jwt".to_string(), addr.clone())]) };
        contract.remove_guard("jwt".to_string());   
        contract.get_guard("jwt".to_string());
    }
}
