// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, env, Promise, NearToken};
use near_sdk::store::LookupMap;
use std::collections::HashMap;

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
            guards: LookupMap::new(b"g"),
            owner: env::current_account_id(),
        }
    }
}

/// Contingency deposit to cover storage costs (prevent small deposit attacks)
const CONTINGENCY_DEPOSIT: u128 = 1_000_000_000_000_000_000_000;

#[near]
impl JwtGuardRouter {
    /// Initializes the contract with provided owner and guards
    /// 
    /// # Arguments
    /// * `owner` - Account ID that will be set as contract owner
    /// * `guards` - Initial mapping of guard names to account IDs
    #[init]
    #[private] 
    pub fn init(owner: AccountId, guards: HashMap<String, AccountId>) -> Self {
        let mut contract = Self {
            guards: LookupMap::new(b"g"),
            owner,
        };
        
        // Insert all guards from the HashMap into the LookupMap
        for (name, account) in guards {
            contract.guards.insert(name, account);
        }
        
        contract
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
        assert!(
            !self.guards.contains_key(&guard_name),
            "Guard with name {} already exists",
            guard_name
        );

        self.guards.insert(guard_name.clone(), guard_account.clone());

        let used_bytes = guard_name.len() + guard_account.as_str().len();

        let required_deposit = env::storage_byte_cost().checked_mul(used_bytes as u128).unwrap().checked_add(NearToken::from_yoctonear(CONTINGENCY_DEPOSIT)).unwrap();
        assert!(
            env::attached_deposit() >= required_deposit,
            "Insufficient deposit. Required: {}, Attached: {}",
            required_deposit,
            env::attached_deposit()
        )
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

        let guard_account = self.guards.remove(&guard_name).unwrap();

        let freed_bytes = guard_name.len() + guard_account.as_str().len();
       
        let return_deposit = env::storage_byte_cost().checked_mul(freed_bytes as u128).unwrap().checked_add(NearToken::from_yoctonear(CONTINGENCY_DEPOSIT)).unwrap();
        if !return_deposit.is_zero() {
            Promise::new(guard_account).transfer(return_deposit);
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
            guards: LookupMap::new(b"a"),
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
            guards: LookupMap::new(b"a"),
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
            guards: LookupMap::new(b"a"),
            owner: owner.clone(),
        };

        contract.get_guard("non_existent".to_string());
    }
}
