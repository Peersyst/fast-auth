// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseError, AccountId, NearToken, Gas};
use std::collections::HashMap;
use near_sdk::serde_json;

// Declare the interfaces module
pub mod external_contracts;
pub mod permission;

use crate::external_contracts::{external_guard};
use crate::permission::{FaPermission};

// Define the contract structure
#[near(contract_state)]
pub struct FastAuth {
    guards: HashMap<String, AccountId>,
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for FastAuth {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
            owner: env::current_account_id(),
        }
    }
}

// Implement the contract structure
#[near]
impl FastAuth {
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
    /// * New instance of FastAuth contract
    /// # Panics
    /// Panics if contract is already initialized
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

    // FastAuth Guard methods

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
    /// * Promise that resolves to a tuple containing:
    ///   * Boolean indicating if verification succeeded
    ///   * String containing the user identifier
    ///   * String containing the permissions
    /// # Panics
    /// Panics if specified guard does not exist
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

    /// Verifies permissions against a payload
    /// # Arguments
    /// * `str_permission` - Permission string in JSON format
    /// * `_payload` - Payload to verify permissions against
    /// # Returns
    /// * Boolean indicating if permissions are valid
    fn verify_permission(&self, str_permission: String, _payload: String) -> bool {
        let _permission: FaPermission = match serde_json::from_str(&str_permission) {
            Ok(p) => p,
            Err(_) => {
                env::log_str("Failed to parse permission JSON");
                return false;
            }
        };
        // TODO: Implement permission verification logic (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
        true
    }

    /// Executes a function call on a specified contract
    /// 
    /// # Arguments
    /// * `contract_address` - The NEAR account ID of the contract to call
    /// * `method_name` - The name of the method to call
    /// * `args` - The arguments to pass to the method in JSON format
    /// 
    /// # Returns
    /// * Promise that resolves to the result of the function call
    /// 
    /// # Panics
    /// Panics if the caller is not the contract owner
    pub fn execute(&self, contract_address: AccountId, method_name: String, args: String, gas: u64) -> Promise {
        self.only_owner();
        
        // Create a promise to call the specified contract
        Promise::new(contract_address)
            .function_call(
                method_name,
                args.as_bytes().to_vec(),
                NearToken::from_yoctonear(0),  // No attached deposit
                Gas::from_tgas(gas),
            )
    }

    /// Callback that processes the verification result
    /// # Arguments
    /// * `call_result` - Result from the guard verification containing:
    ///   * Boolean indicating verification success
    ///   * String containing user identifier
    ///   * String containing permissions
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean indicating overall verification success
    ///   * String containing the user identifier
    ///   * String containing the permissions
    #[private]
    pub fn on_verify_callback(&mut self, #[callback_result] call_result: Result<(bool, String, String), PromiseError>) -> (bool, String, String) {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            return (false, String::new(), String::new());
        } 
        // Extract the actual boolean result from the Ok value
        let (verification_result, user, permissions) = call_result.unwrap();
        if !verification_result {
            env::log_str("Guard verification rejected");
            return (false, user, permissions);
        }
        // TODO: Implement permission verification logic (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
        let permission_result = self.verify_permission(permissions.clone(), "mocked_permissions".to_string());
        if !permission_result {
            env::log_str("Permission verification rejected");
            return (false, user, permissions);
        }
        (permission_result, user, permissions)
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
        let contract = FastAuth { guards: HashMap::from([("jwt".to_string(), addr.clone())]), owner: env::current_account_id() };
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn get_non_existing_guard() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id() };
        contract.get_guard("jwt".to_string());
    }

    #[test]
    fn owner() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id() };
        assert_eq!(contract.owner(), env::current_account_id());
    }
}