// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseError, AccountId, Gas};
use std::collections::HashMap;

// Declare the interfaces module
pub mod interfaces;

use crate::interfaces::{external_guard};
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

    // Verification methods

    // Public method - accepts a guard_id and payload, and verifies the guard
    pub fn verify(&self, guard_id: String, payload: String) -> Promise {
        let guard_address = self.get_guard(guard_id);

        external_guard::ext(guard_address.clone())
        .with_static_gas(GAS_FOR_VERIFY)
        .verify(payload)
        .then(Self::ext(env::current_account_id())
            .on_verify_callback()
        )
    }

    #[private]
    pub fn on_verify_callback(&mut self, #[callback_result] call_result: Result<bool, PromiseError>) -> bool {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            false
        } else {
            env::log_str("Guard verification successful");
            true
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
