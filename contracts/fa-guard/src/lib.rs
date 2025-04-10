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
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for FaGuard {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
            owner: env::current_account_id(),
        }
    }
}

// Implement the contract structure
#[near]
impl FaGuard {
    /// Checks if the caller is the contract owner
    /// # Panics
    /// Panics if the caller is not the owner
    fn only_owner(&self) {
        assert!(env::signer_account_id() == self.owner, "Only the owner can call this function");
    }

    /// Gets the current owner of the contract
    /// # Returns
    /// * AccountId of the current owner
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Changes the owner of the contract
    /// # Arguments
    /// * `new_owner` - New owner account ID
    /// # Panics
    /// Panics if caller is not the owner
    pub fn change_owner(&mut self, new_owner: AccountId) {
        self.only_owner();
        self.owner = new_owner;
    }

    /// Initializes the contract with a set of guards and an owner
    /// # Arguments
    /// * `init_guards` - Initial mapping of guard IDs to their contract addresses
    /// * `owner` - Account ID that will be set as the contract owner
    /// # Returns
    /// * New instance of FaGuard contract
    #[init]
    #[private]
    pub fn init(init_guards: HashMap<String, AccountId>, owner: AccountId) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            guards: init_guards,
            owner: owner,
        }
    }

    // FaGuard Guard methods

    /// Gets the contract address for a given guard ID
    /// # Arguments
    /// * `guard_id` - ID of the guard to look up
    /// # Returns
    /// * AccountId of the guard contract
    /// # Panics
    /// Panics if guard_id does not exist
    pub fn get_guard(&self, guard_id: String) -> AccountId {
        self.guards.get(&guard_id).cloned().unwrap_or_else(|| {
            env::panic_str(&format!("Guard with ID '{}' does not exist", guard_id));
        })
    }

    /// Adds a new guard to the contract
    /// # Arguments
    /// * `guard_id` - ID to associate with the guard
    /// * `guard_address` - Contract address of the guard
    /// # Panics
    /// Panics if caller is not the owner
    pub fn add_guard(&mut self, guard_id: String, guard_address: AccountId) {
        self.only_owner();
        log!("Saving guard: {guard_id}");
        self.guards.insert(guard_id, guard_address);
    }

    /// Removes a guard from the contract
    /// # Arguments
    /// * `guard_id` - ID of the guard to remove
    /// # Panics
    /// Panics if caller is not the owner
    pub fn remove_guard(&mut self, guard_id: String) {
        self.only_owner();
        log!("Removing guard: {guard_id}");
        self.guards.remove(&guard_id);
    }

    // Verification methods

    /// Verifies a payload using the specified guard
    /// # Arguments
    /// * `guard_id` - ID of the guard to use for verification
    /// * `payload` - Data to verify
    /// # Returns
    /// * Promise that resolves to verification result
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

    /// Callback that processes the verification result
    /// # Arguments
    /// * `call_result` - Result from the guard verification
    /// # Returns
    /// * Boolean indicating if verification succeeded
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
        let contract = FaGuard { guards: HashMap::from([("jwt".to_string(), addr.clone())]), owner: env::current_account_id() };
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn get_non_existing_guard() {
        let contract = FaGuard { guards: HashMap::new(), owner: env::current_account_id() };
        contract.get_guard("jwt".to_string());
    }

    #[test]
    fn owner() {
        let contract = FaGuard { guards: HashMap::new(), owner: env::current_account_id() };
        assert_eq!(contract.owner(), env::current_account_id());
    }
}