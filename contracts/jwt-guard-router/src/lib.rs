// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, env, NearToken, Promise, PromiseError};
use near_sdk::store::LookupMap;
use crate::external_contract::jwt_guard;

pub mod external_contract;

pub const GUARD_NAME_MAX_BYTES_LENGTH: u128 = 2048;
pub const MAX_ACCOUNT_BYTES_LENGTH: u128 = 64;
// NOTE: 1 NEAR
pub const CONTINGENCY_DEPOSIT: u128 = 1_000_000_000_000_000_000_000_000;

const MAP_KEY: &[u8] = b"g";

/// Contract that manages JWT guard accounts
/// 
/// This contract maintains a mapping of guard names to their corresponding account IDs
/// and provides functionality to add, remove and query guards. Only the contract owner
/// can remove guards.
#[near(contract_state)]
pub struct JwtGuardRouter {
    /// Mapping of guard names to their account IDs
    guards: LookupMap<String, AccountId>,
    /// Account ID of the contract owner
    owner: AccountId,
}

/// Default implementation initializes contract with empty guards and sets owner
/// to the current account
impl Default for JwtGuardRouter {
    fn default() -> Self {
        Self {
            guards: LookupMap::new(MAP_KEY),
            owner: env::current_account_id(),
        }
    }
}

#[near]
impl JwtGuardRouter {
    /// Initializes the contract with provided owner and guards
    /// 
    /// # Arguments
    /// * `owner` - Account ID that will be set as contract owner
    /// * `guards` - Initial mapping of guard names to account IDs
    #[init]
    #[private] 
    pub fn init(owner: AccountId) -> Self {
        Self {
            guards: LookupMap::new(MAP_KEY),
            owner,
        }
    }

    /// Checks if caller is contract owner, panics if not
    fn only_owner(&self) {
        assert_eq!(env::signer_account_id(), self.owner, "Only the owner can call this function");
    }

    /// Returns the account ID of contract owner
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Changes the owner of the contract to a new account
    /// 
    /// # Arguments
    /// * `new_owner` - The account ID that will become the new owner
    /// 
    /// # Panics
    /// Panics if the caller is not the current owner
    pub fn change_owner(&mut self, new_owner: AccountId) {
        self.only_owner();
        self.owner = new_owner;
    }

    /// Adds a new guard to the contract
    /// 
    /// # Arguments
    /// * `guard_name` - Name identifier for the guard
    /// * `guard_account` - Account ID of the guard
    /// 
    /// # Note
    /// Requires attached deposit to cover storage costs
    #[payable]
    pub fn add_guard(&mut self, guard_name: String, guard_account: AccountId) {
        self.only_owner();
        assert!(!guard_name.contains('#'), "Guard name cannot contain '#' character");
        assert!(guard_name.len() as u128 <= GUARD_NAME_MAX_BYTES_LENGTH, "Guard name is too long");
        assert!(guard_account.as_str().len() as u128 <= MAX_ACCOUNT_BYTES_LENGTH, "Guard account is too long");
        let required_deposit = env::storage_byte_cost().checked_mul(GUARD_NAME_MAX_BYTES_LENGTH + MAX_ACCOUNT_BYTES_LENGTH).unwrap().checked_add(NearToken::from_yoctonear(CONTINGENCY_DEPOSIT)).unwrap();
        assert!(
            env::attached_deposit() >= required_deposit,
            "Insufficient deposit. Required: {}",
            required_deposit
        );

        assert!(
            !self.guards.contains_key(&guard_name),
            "Guard with name {} already exists",
            guard_name
        );

        self.guards.insert(guard_name.clone(), guard_account.clone());
    }

    /// Retrieves guard account ID by name
    /// 
    /// # Arguments
    /// * `guard_name` - Name of the guard to look up
    /// 
    /// # Returns
    /// * `Option<AccountId>` - Account ID if guard exists, None otherwise
    pub fn get_guard(&self, guard_name: String) -> AccountId {
        self.guards.get(&guard_name).cloned().unwrap_or_else(|| {
            env::panic_str(&format!("Guard with name '{}' does not exist", guard_name));
        })
    }

    /// Removes a guard from the contract
    /// 
    /// # Arguments
    /// * `guard_name` - Name of the guard to remove
    /// 
    /// # Note
    /// Only callable by contract owner
    /// Returns storage deposit to the guard account
    pub fn remove_guard(&mut self, guard_name: String) {
        self.only_owner();

        assert!(
            self.guards.contains_key(&guard_name),
            "Guard with name {} does not exist",
            guard_name
        );

        self.guards.remove(&guard_name).unwrap();
    }

    /// Validates that a guard name follows the expected format of "jwt#GUARD_NAME"
    /// 
    /// # Arguments
    /// * `guard_name` - The guard name to validate
    /// 
    /// # Returns
    /// * `(String, String)` - A tuple containing:
    ///   * The "jwt" prefix
    ///   * The actual guard name portion
    /// 
    /// # Panics
    /// * If the guard name does not follow the "jwt#GUARD_NAME" format
    fn assert_guard_name_format(&self, guard_name: String) -> (String, String) {
        let parts: Vec<&str> = guard_name.split('#').collect();
        assert!(
            parts.len() == 2 && parts[0] == "jwt",
            "Invalid guard name format. Expected 'jwt#GUARD_NAME'"
        );

        (parts[0].to_string(), parts[1].to_string())
    }

    /// Verifies a JWT token using the specified guard
    /// 
    /// # Arguments
    /// * `ty` - Type of the guard to use for verification
    /// * `jwt` - The JWT token to verify as a string
    /// * `sign_payload` - The payload to be signed by the MPC
    /// # Returns
    pub fn verify(&self, guard_id: String, verify_payload: String, sign_payload: Vec<u8>) -> Promise {
        let (_, guard_name) = self.assert_guard_name_format(guard_id);
        let guard_account = self.get_guard(guard_name.clone());

        jwt_guard::ext(guard_account)
            .verify(verify_payload, sign_payload)
            .then(Self::ext(env::current_account_id()).on_verify_callback(guard_name))
    }

    /// Formats a path for a guard
    /// # Arguments
    /// * `guard_name` - Name of the guard
    /// * `sub` - Substring to append to the guard name
    /// # Returns
    /// * The formatted path
    fn format_path(&self, guard_name: String, sub: String) -> String {
        format!("{}#{}", guard_name, sub)
    }

    /// Callback that processes the verification result
    /// # Arguments
    /// * `guard_name` - Name of the guard that was used for verification
    /// * `call_result` - Result from the guard verification containing:
    ///   * Boolean indicating verification success
    ///   * String containing the user identifier
    /// # Returns
    pub fn on_verify_callback(&mut self, guard_name: String, #[callback_result] call_result: Result<(bool, String), PromiseError>) -> (bool, String) {
        if call_result.is_err() {
            env::panic_str(&format!("Error verifying JWT: {:?}", call_result.err().unwrap()));
        }

        let (valid, sub) = call_result.unwrap();
        if valid {
            let result = self.format_path(guard_name, sub);
            (true, result)
        } else {
            (false, "".to_string())
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
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, AccountId};

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_owner() {
        let owner = accounts(1);
        let context = get_context(owner.clone());
        testing_env!(context.build());
        
        let contract = JwtGuardRouter {
            guards: LookupMap::new(MAP_KEY),
            owner: owner.clone(),
        };
        
        assert_eq!(contract.owner(), owner);
    }

    #[test]
    fn test_get_existing_guard() {
        let owner = accounts(1);
        let mut context = get_context(owner.clone());
        // Set up a deposit of 1 NEAR for the test
        context.attached_deposit(NearToken::from_near(1));
        testing_env!(context.build());

        // Add a guard
        let guard_name = "jwt".to_string();
        let guard_account: AccountId = "jwt.fast-auth.near".parse().unwrap();

        let mut contract = JwtGuardRouter {
            guards: LookupMap::new(MAP_KEY),
            owner: owner.clone(),
        };

        // Insert the guard
        contract.guards.insert(guard_name.clone(), guard_account.clone());

        assert_eq!(contract.get_guard(guard_name), guard_account);
    }

    #[test]
    #[should_panic]
    fn test_get_non_existing_guard() {
        let owner = accounts(1);
        let context = get_context(owner.clone());
        testing_env!(context.build());

        let contract = JwtGuardRouter {
            guards: LookupMap::new(MAP_KEY),
            owner: owner.clone(),
        };

        contract.get_guard("non_existent".to_string());
    }

    #[test]
    fn test_verify() {
        let owner = accounts(1);
        let context = get_context(owner.clone());
        testing_env!(context.build());

        let guard_name = "my-guard.com".to_string();
        let guard_account: AccountId = "jwt.fast-auth.near".parse().unwrap();

        let mut contract = JwtGuardRouter {
            guards: LookupMap::new(MAP_KEY),
            owner: owner.clone(),
        };

        // Add the guard that will be used for verification
        contract.guards.insert(guard_name.clone(), guard_account.clone());

        let jwt = "test.jwt.token".to_string();
        let sign_payload = vec![1, 2, 3];

        // Call verify which should make cross-contract call to the guard
        contract.verify("jwt#my-guard.com".to_string(), jwt, sign_payload);
    }
}
