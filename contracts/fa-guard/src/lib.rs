// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseError, AccountId};
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

// Implement the contract structure
#[near]
impl FaGuard {

    #[init]
    #[private]
    pub fn init(init_guards: HashMap<String, AccountId>) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            guards: init_guards,
        }
    }

    // FaGuard Guard methods

    // Public method - returns the guard saved, defaulting to DEFAULT_GUARD
    pub fn get_guard(&self, guard_id: String) -> AccountId {
        self.guards.get(&guard_id).cloned().unwrap_or_else(|| {
            env::panic_str(&format!("Guard with ID '{}' does not exist", guard_id));
        })
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
        let guard_address = match self.guards.get(&guard_id) {
            Some(address) => address.clone(),
            None => {
                env::panic_str(&format!("Cannot verify: Guard with ID '{}' does not exist", guard_id));
            }
        };

        external_guard::ext(guard_address.clone())
        .verify(payload)
        .then(Self::ext(env::current_account_id())
            .on_verify_callback()
        )
    }

    #[private]
    pub fn on_verify_callback(&mut self, #[callback_result] call_result: Result<(bool, String, String), PromiseError>) -> (bool, String, String) {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            return (false, String::new(), String::new());
        } 
        // Extract the actual boolean result from the Ok value
        let (verification_result, user, permissions) = call_result.unwrap();
        if verification_result {
            env::log_str("Guard verification successful");
        } else {
            env::log_str("Guard verification rejected");
        }
        (verification_result, user, permissions)
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
