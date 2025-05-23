// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, env};
use std::collections::HashMap;

// Define the contract structure
#[near(contract_state)]
pub struct JwtGuardRouter {
    guards: HashMap<String, AccountId>,
    owner: AccountId,
}

// Define the default, which automatically initializes the contract
impl Default for JwtGuardRouter {
    fn default() -> Self {
        Self {
            guards: HashMap::new(),
            owner: env::current_account_id(),
        }
    }
}

// Implement the contract structure
#[near]
impl JwtGuardRouter {
    #[init]
    #[private]
    pub fn init(owner: AccountId, guards: HashMap<String, AccountId>) -> Self {
        Self {
            guards,
            owner,
        }
    }

    fn only_owner(&self) {
        assert_eq!(env::current_account_id(), self.owner, "Only the owner can call this function");
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn add_guard(&mut self, guard_name: String, guard_account: AccountId) {
        self.guards.insert(guard_name, guard_account);
    }

    pub fn get_guard(&self, guard_name: String) -> Option<AccountId> {
        self.guards.get(&guard_name).cloned()
    }

    pub fn remove_guard(&mut self, guard_name: String) {
        self.only_owner();
        self.guards.remove(&guard_name);
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
        let mut context = get_context(owner.clone());
        testing_env!(context.build());
        
        let contract = JwtGuardRouter {
            guards: HashMap::new(),
            owner: owner.clone(),
        };
        
        assert_eq!(contract.owner(), owner);
    }

    #[test]
    fn test_add_and_get_guard() {
        let owner = accounts(1);
        let mut context = get_context(owner.clone());
        testing_env!(context.build());
        
        let mut contract = JwtGuardRouter {
            guards: HashMap::new(),
            owner: owner.clone(),
        };
        
        let guard_name = "test_guard".to_string();
        let guard_account = accounts(2);
        
        // Test adding a guard
        contract.add_guard(guard_name.clone(), guard_account.clone());
        
        // Test getting the guard
        let retrieved_guard = contract.get_guard(guard_name.clone());
        assert_eq!(retrieved_guard, Some(guard_account));
        
        // Test getting non-existent guard
        let non_existent_guard = contract.get_guard("non_existent".to_string());
        assert_eq!(non_existent_guard, None);
    }

    #[test]
    #[should_panic(expected = "Only the owner can call this function")]
    fn test_remove_guard_not_owner() {
        let owner = accounts(1);
        let non_owner = accounts(2);
        let mut context = get_context(non_owner.clone());
        testing_env!(context.build());
        
        let mut contract = JwtGuardRouter {
            guards: HashMap::new(),
            owner: owner.clone(),
        };
        
        let guard_name = "test_guard".to_string();
        let guard_account = accounts(3);
        
        // Add a guard first
        contract.add_guard(guard_name.clone(), guard_account);
        
        // Try to remove guard as non-owner (should panic)
        contract.remove_guard(guard_name);
    }

    #[test]
    fn test_remove_guard_as_owner() {
        let owner = accounts(1);
        let mut context = get_context(owner.clone());
        testing_env!(context.build());
        
        let mut contract = JwtGuardRouter {
            guards: HashMap::new(),
            owner: owner.clone(),
        };
        
        let guard_name = "test_guard".to_string();
        let guard_account = accounts(2);
        
        // Add a guard first
        contract.add_guard(guard_name.clone(), guard_account.clone());
        
        // Verify guard exists
        assert_eq!(contract.get_guard(guard_name.clone()), Some(guard_account));
        
        // Remove guard as owner
        contract.remove_guard(guard_name.clone());
        
        // Verify guard is removed
        assert_eq!(contract.get_guard(guard_name), None);
    }
}
