// Find all our documentation at https://docs.near.org
use near_sdk::{env, log, near, Promise, PromiseError, AccountId, NearToken, Gas};
use std::collections::HashMap;
// Declare the interfaces module
pub mod external_contracts;
pub mod permission;

use crate::external_contracts::{external_guard, mpc_contract, SignRequest, SignResponse};
use crate::permission::{FaPermissionType, FaEVMPermissions, FaBTCPermissions, FaNearPermissions};
const DEFAULT_MPC_KEY_VERSION: u32 = 0;

// Define the contract structure
#[near(contract_state)]
pub struct FastAuth {
    guards: HashMap<String, AccountId>,
    owner: AccountId,
    mpc_address: AccountId,
    mpc_key_version: u32,
}

// Define the default, which automatically initializes the contract
impl Default for FastAuth {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
            owner: env::current_account_id(),
            mpc_address: env::current_account_id(),
            mpc_key_version: DEFAULT_MPC_KEY_VERSION,
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
            mpc_address: env::current_account_id(),
            mpc_key_version: DEFAULT_MPC_KEY_VERSION,
        }
    }

    // FastAuth MPC methods
    /// Sets the MPC contract address
    /// # Arguments
    /// * `mpc_address` - New MPC contract address
    /// # Panics
    /// Panics if caller is not the owner
    pub fn set_mpc_address(&mut self, mpc_address: AccountId) {
        self.only_owner();
        env::log_str(&format!("Setting MPC address to {}", mpc_address));
        self.mpc_address = mpc_address;
    }

    /// Gets the current MPC contract address
    /// # Returns
    /// * AccountId of the current MPC contract
    pub fn mpc_address(&self) -> AccountId {
        self.mpc_address.clone()
    }

    /// Sets the MPC key version
    /// # Arguments
    /// * `mpc_key_version` - New MPC key version number
    /// # Panics
    /// Panics if caller is not the owner
    pub fn set_mpc_key_version(&mut self, mpc_key_version: u32) {
        self.only_owner();
        env::log_str(&format!("Setting MPC key version to {}", mpc_key_version));
        self.mpc_key_version = mpc_key_version;
    }

    /// Gets the current MPC key version
    /// # Returns
    /// * Current MPC key version number
    pub fn mpc_key_version(&self) -> u32 {
        self.mpc_key_version
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
    fn verify_permission(&self, _str_permission: String, _payload: String) -> bool {
        // TODO: Implement permission verification logic (https://www.notion.so/contract-Define-permissions-1d121cedf84a80fcb322d1d23860e7cd?pvs=4)
        let permission_type = permission::decode_permission_type(_str_permission);
        match permission_type {
            FaPermissionType::EVMPermission => {
                env::log_str("EVMPermission");
                true
            }
            FaPermissionType::BTCPermission => {
                env::log_str("BTCPermission");
                true
            }
            FaPermissionType::NearPermission => {
                env::log_str("NearPermission");
                true
            }
            _ => {
                env::log_str("Unknown permission type");
                false
            }
        }
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

    // Signing methods
    
    /// Initiates the signing process by first verifying the JWT with a guard and then signing the payload
    /// # Arguments
    /// * `guard_id` - ID of the guard to use for JWT verification
    /// * `payload` - Data to be signed
    /// * `jwt` - JWT token to verify
    /// # Returns
    /// * Promise chain that will verify the JWT and then sign the payload if verification succeeds
    /// # Notes
    /// * This is a payable method - requires attached deposit to cover MPC signing costs
    #[payable]
    pub fn sign(&mut self, guard_id: String, payload: Vec<u8>, jwt: String) -> Promise {
        let attached_deposit = env::attached_deposit();
        // assert!(env::prepaid_gas() < Gas::from_tgas(MPC_TGAS), "Gas does not cover the cost of the MPC signing");
        Self::ext(env::current_account_id())
            .verify(guard_id, jwt)
            .then(Self::ext(env::current_account_id())
                .on_verify_sign_callback(payload, attached_deposit)
        )
    }

    /// Callback that processes the JWT verification result and initiates MPC signing if verification succeeded
    /// # Arguments
    /// * `payload` - Data to be signed
    /// * `attached_deposit` - Deposit amount from original call to forward to MPC contract
    /// * `call_result` - Result from the guard verification containing success status, user ID and permissions
    /// # Returns
    /// * Promise to perform MPC signing if verification succeeded, or empty promise if verification failed
    #[private]
    pub fn on_verify_sign_callback(&mut self, payload: Vec<u8>, attached_deposit: NearToken, #[callback_result] call_result: Result<(bool, String, String), PromiseError>) -> Promise {
        if call_result.is_err() {
            env::log_str("Guard verification failed");
            return Promise::new(env::current_account_id());
        } 
        let (verification_result, user, _permissions) = call_result.unwrap();
        if !verification_result {
            env::log_str("Guard verification rejected");
            return Promise::new(env::current_account_id());
        }

        let request = SignRequest {
            payload,
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

    /// Final callback that processes the MPC signing result
    /// # Arguments
    /// * `call_result` - Result containing the signature from the MPC contract
    /// # Returns
    /// * Option containing the signature response if successful, None if signing failed
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
        let contract = FastAuth { guards: HashMap::from([("jwt".to_string(), addr.clone())]), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION };
        assert_eq!(contract.get_guard("jwt".to_string()), addr);
    }

    #[test]
    #[should_panic]
    fn get_non_existing_guard() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION };
        contract.get_guard("jwt".to_string());
    }

    #[test]
    fn owner() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION };
        assert_eq!(contract.owner(), env::current_account_id());
    }

    #[test]
    fn mpc_address() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION };
        assert_eq!(contract.mpc_address(), env::current_account_id());
    }

    #[test]
    fn mpc_key_version() {
        let contract = FastAuth { guards: HashMap::new(), owner: env::current_account_id(), mpc_address: env::current_account_id(), mpc_key_version: DEFAULT_MPC_KEY_VERSION };
        assert_eq!(contract.mpc_key_version(), DEFAULT_MPC_KEY_VERSION);
    }
}