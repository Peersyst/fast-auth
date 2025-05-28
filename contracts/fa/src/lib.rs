// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseError, AccountId, NearToken, Gas};
use std::collections::HashMap;
// Declare the interfaces module
pub mod external_contracts;

use crate::external_contracts::{external_guard, mpc_contract, SignRequest, SignResponse};

const DEFAULT_MPC_KEY_VERSION: u32 = 0;

const CONTRACT_VERSION: &str = "0.1.0";

// Define the contract structure
#[near(contract_state)]
pub struct FastAuth {
    guards: HashMap<String, AccountId>,
    owner: AccountId,
    mpc_address: AccountId,
    mpc_key_version: u32,
    version: String,
}

// Define the default, which automatically initializes the contract
impl Default for FastAuth {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
            owner: env::current_account_id(),
            mpc_address: env::current_account_id(),
            mpc_key_version: DEFAULT_MPC_KEY_VERSION,
            version: CONTRACT_VERSION.to_string(),
        }
    }
}

// Implement the contract structure
#[near]
impl FastAuth {
    /// Checks if the caller is the contract owner
    /// # Panics
    /// * If the caller is not the owner
    fn only_owner(&self) {
        assert!(env::signer_account_id() == self.owner, "Only the owner can call this function");
    }

    /// Gets the current owner of the contract
    /// # Returns
    /// * The AccountId of the current owner
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Changes the owner of the contract
    /// # Arguments
    /// * `new_owner` - The AccountId of the new owner
    /// # Panics
    /// * If the caller is not the current owner
    pub fn change_owner(&mut self, new_owner: AccountId) {
        self.only_owner();
        self.owner = new_owner;
    }

    /// Initializes the contract with initial guards and owner
    /// # Arguments
    /// * `init_guards` - HashMap mapping guard IDs to their contract addresses
    /// * `owner` - The AccountId to set as contract owner
    /// # Returns
    /// * The initialized FastAuth contract instance
    /// # Panics
    /// * If the contract has already been initialized
    #[init]
    #[private]
    pub fn init(init_guards: HashMap<String, AccountId>, owner: AccountId) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            guards: init_guards,
            owner: owner,
            mpc_address: env::current_account_id(),
            mpc_key_version: DEFAULT_MPC_KEY_VERSION,
            version: CONTRACT_VERSION.to_string(),
        }
    }

    // FastAuth MPC methods
    
    /// Sets the MPC contract address
    /// # Arguments
    /// * `mpc_address` - The AccountId of the new MPC contract
    /// # Panics
    /// * If the caller is not the owner
    pub fn set_mpc_address(&mut self, mpc_address: AccountId) {
        self.only_owner();
        env::log_str(&format!("Setting MPC address to {}", mpc_address));
        self.mpc_address = mpc_address;
    }

    /// Gets the current MPC contract address
    /// # Returns
    /// * The AccountId of the current MPC contract
    pub fn mpc_address(&self) -> AccountId {
        self.mpc_address.clone()
    }

    /// Sets the MPC key version
    /// # Arguments
    /// * `mpc_key_version` - The new MPC key version number
    /// # Panics
    /// * If the caller is not the owner
    pub fn set_mpc_key_version(&mut self, mpc_key_version: u32) {
        self.only_owner();
        env::log_str(&format!("Setting MPC key version to {}", mpc_key_version));
        self.mpc_key_version = mpc_key_version;
    }

    /// Gets the current MPC key version
    /// # Returns
    /// * The current MPC key version number
    pub fn mpc_key_version(&self) -> u32 {
        self.mpc_key_version
    }


    // FastAuth Guard methods

    /// Gets the contract address for a guard
    /// # Arguments
    /// * `guard_id` - The ID of the guard to look up
    /// # Returns
    /// * The AccountId of the guard contract
    /// # Panics
    /// * If the guard_id does not exist
    pub fn get_guard(&self, guard_id: String) -> AccountId {
        self.guards.get(&guard_id).cloned().unwrap_or_else(|| {
            env::panic_str(&format!("Guard with ID '{}' does not exist", guard_id));
        })
    }

    /// Adds a new guard to the contract
    /// # Arguments
    /// * `guard_id` - The ID to associate with the guard
    /// * `guard_address` - The contract address of the guard
    /// # Panics
    /// * If the caller is not the owner
    pub fn add_guard(&mut self, guard_id: String, guard_address: AccountId) {
        self.only_owner();
        log!("Saving guard: {guard_id}");
        self.guards.insert(guard_id, guard_address);
    }

    /// Removes a guard from the contract
    /// # Arguments
    /// * `guard_id` - The ID of the guard to remove
    /// # Panics
    /// * If the caller is not the owner
    pub fn remove_guard(&mut self, guard_id: String) {
        self.only_owner();
        log!("Removing guard: {guard_id}");
        self.guards.remove(&guard_id);
    }

    /// Gets the prefix from a guard ID
    /// # Arguments
    /// * `guard_id` - The guard ID to parse
    /// # Returns
    /// * The prefix portion of the guard ID
    /// # Panics
    /// * If guard_id is empty
    /// * If guard_id is not in format 'guard' or 'prefix/suffix'
    fn get_guard_prefix(&self, guard_id: String) -> String {
        if guard_id.is_empty() {
            env::panic_str("Guard ID cannot be empty");
        }

        match guard_id.split('/').next() {
            Some(prefix) if !prefix.is_empty() => prefix.to_string(),
            _ => env::panic_str("Guard ID must be in format 'guard' or 'prefix/suffix'")
        }
    }

    // Verification methods

    /// Verifies a payload using a specified guard
    /// # Arguments
    /// * `guard_id` - The ID of the guard to use
    /// * `verify_payload` - The data to verify
    /// * `sign_payload` - Additional data to be signed if verification succeeds
    /// # Returns
    /// * Promise resolving to a tuple containing:
    ///   * Boolean indicating verification success
    ///   * String containing user identifier
    /// # Panics
    /// * If the specified guard does not exist
    pub fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>) -> Promise {
        let guard_prefix = self.get_guard_prefix(guard_id.clone());
        let guard_address = match self.guards.get(&guard_prefix) {
            Some(address) => address.clone(),
            None => {
                env::panic_str(&format!("Cannot verify: Guard with ID '{}' does not exist", guard_id));
            }
        };

        external_guard::ext(guard_address.clone())
        .verify(guard_id, verify_payload, sign_payload)
        .then(Self::ext(env::current_account_id())
            .on_verify_callback()
        )
    }

    /// Executes a function call on another contract
    /// # Arguments
    /// * `contract_address` - The target contract's AccountId
    /// * `method_name` - The name of the method to call
    /// * `args` - The arguments as a JSON string
    /// * `gas` - Amount of gas to attach to the call
    /// # Returns
    /// * Promise resolving to the function call result
    /// # Panics
    /// * If the caller is not the contract owner
    pub fn execute(&self, contract_address: AccountId, method_name: String, args: String, gas: u64) -> Promise {
        self.only_owner();
        
        Promise::new(contract_address)
            .function_call(
                method_name,
                args.as_bytes().to_vec(),
                NearToken::from_yoctonear(0),  // No attached deposit
                Gas::from_tgas(gas),
            )
    }

    /// Processes verification results
    /// # Arguments
    /// * `call_result` - Result containing:
    ///   * Boolean for verification success
    ///   * String for user identifier
    /// # Returns
    /// * Tuple containing:
    ///   * Boolean for overall success
    ///   * String for user identifier
    #[private]
    pub fn on_verify_callback(&mut self, #[callback_result] call_result: Result<(bool, String), PromiseError>) -> (bool, String) {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            return (false, String::new());
        } 
        let (verification_result, user) = call_result.unwrap();
        if !verification_result {
            env::log_str("Guard verification rejected");
            return (false, user);
        }
        (verification_result, user)
    }

    // Signing methods
    
    /// Initiates signing by verifying JWT then signing payload
    /// # Arguments
    /// * `guard_id` - The guard ID for JWT verification
    /// * `verify_payload` - The JWT to verify
    /// * `sign_payload` - The data to sign
    /// # Returns
    /// * Promise chain for verification then signing
    /// # Notes
    /// * Requires attached deposit for MPC costs
    #[payable]
    pub fn sign(&mut self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>) -> Promise {
        let attached_deposit = env::attached_deposit();
        Self::ext(env::current_account_id())
            .verify(guard_id, verify_payload, sign_payload.clone())
            .then(Self::ext(env::current_account_id())
                .on_verify_sign_callback(sign_payload, attached_deposit)
        )
    }

    /// Processes verification and initiates MPC signing
    /// # Arguments
    /// * `sign_payload` - The data to sign
    /// * `attached_deposit` - Deposit to forward to MPC
    /// * `call_result` - Verification result containing success and user ID
    /// # Returns
    /// * Promise for MPC signing or empty promise if verification failed
    #[private]
    pub fn on_verify_sign_callback(&mut self, sign_payload: Vec<u8>, attached_deposit: NearToken, #[callback_result] call_result: Result<(bool, String), PromiseError>) -> Promise {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            return Promise::new(env::current_account_id());
        } 
        let (verification_result, user) = call_result.unwrap();
        if !verification_result {
            env::log_str("Guard verification rejected");
            return Promise::new(env::current_account_id());
        }

        let payload_hash = env::sha256(&sign_payload);

        let request = SignRequest {
            payload: payload_hash,
            path: user,
            key_version: self.mpc_key_version,
        };

        mpc_contract::ext(self.mpc_address.clone())
            .with_attached_deposit(attached_deposit)
            .sign(request)
            .then(Self::ext(env::current_account_id())
                .on_sign_callback()
        )
    }

    /// Processes MPC signing result
    /// # Arguments
    /// * `call_result` - The signing result from MPC
    /// # Returns
    /// * Option containing signature if successful
    #[private]
    pub fn on_sign_callback(&mut self, #[callback_result] call_result: Result<SignResponse, PromiseError>) -> Option<SignResponse> {
        if call_result.is_err() {
            env::log_str("MPC signing failed");
            return None;
        } 

        let sign_response = call_result.unwrap();
        env::log_str(&format!("MPC signing successful: {:?}", sign_response));
        Some(sign_response)
    }

    // Version methods

    /// Gets the contract version
    /// # Returns
    /// * The current version string
    pub fn version(&self) -> String {
        self.version.clone()
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
        let contract = FastAuth { guards: HashMap::from([("jwt".to_string(), addr.clone())]), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn get_non_existing_guard() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        contract.get_guard("jwt".to_string());
    }

    #[test]
    #[should_panic]
    fn get_guard_prefix_with_empty_guard_id() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        contract.get_guard_prefix("".to_string());
    }

    #[test]
    fn get_guard_prefix_without_prefix() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.get_guard_prefix("jwt".to_string()), "jwt");

        assert_eq!(contract.get_guard_prefix("jwt/".to_string()), "jwt");
    }

    #[test]
    fn get_guard_prefix_with_prefix_and_single_suffix() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.get_guard_prefix("jwt/sub".to_string()), "jwt");
    }

    #[test]
    fn get_guard_prefix_with_prefix_and_multiple_suffixes() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.get_guard_prefix("jwt/sub/suffix".to_string()), "jwt");
    }

    #[test]
    fn owner() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.owner(), env::current_account_id());
    }

    #[test]
    fn mpc_address() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.mpc_address(), env::current_account_id());
    }

    #[test]
    fn mpc_key_version() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: CONTRACT_VERSION.to_string() };
        assert_eq!(contract.mpc_key_version(), DEFAULT_MPC_KEY_VERSION);
    }
    
    #[test]
    fn version() {
        let version = "0.1.0".to_string();
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION, version: version.clone() };
        assert_eq!(contract.version(), version);
    }
}