// Find all our documentation at https://docs.near.org
use near_sdk::{near, env, AccountId};
use std::collections::HashMap;
use crate::permission::FaPermission;

pub mod permission;

// Define the contract structure
#[near(contract_state)]
pub struct FaPermissions {
    // Contract permissions management
    owner: AccountId,
    permissions_manager: AccountId,
    
    // User permissions
    user_permissions: HashMap<String, Vec<FaPermission>>,
}

// Define the default, which automatically initializes the contract
impl Default for FaPermissions {
    fn default() -> Self {
        Self {
            owner: env::current_account_id(),
            permissions_manager: env::current_account_id(),
            user_permissions: HashMap::new(),
        }
    }
}

// Implement the contract structure
#[near]
impl FaPermissions {

    /// Initializes the contract with a specified owner
    /// 
    /// # Arguments
    /// * `owner` - The account ID that will be set as the contract owner
    ///
    /// # Returns
    /// A new instance of the contract with the specified owner
    ///
    /// # Panics
    /// Panics if the contract is already initialized
    #[init]
    pub fn init(owner: AccountId, permissions_manager: AccountId) -> Self {
        if env::state_exists() {
            env::panic_str("Contract is already initialized");
        }
        Self {
            owner: owner.clone(),
            permissions_manager: permissions_manager.clone(),
            user_permissions: HashMap::new(),
        }
    }

    /// Checks if the caller is the contract owner
    /// # Panics
    /// Panics if the caller is not the owner
    fn only_owner(&self) {
        assert!(env::signer_account_id() == self.owner, "Only the owner can call this function");
    }

    /// Checks if the caller is the permissions manager
    /// # Panics
    /// Panics if the caller is not the permissions manager
    fn only_permissions_manager(&self) {
        assert!(env::signer_account_id() == self.permissions_manager, "Only the permissions manager can call this function");
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

    /// Changes the role manager of the contract
    /// # Arguments
    /// * `new_permissions_manager` - New permissions manager account ID
    /// # Panics
    /// Panics if caller is not the owner
    pub fn change_permissions_manager(&mut self, new_permissions_manager: AccountId) {
        self.only_owner();
        self.permissions_manager = new_permissions_manager;
    }

    /// Gets the current role manager of the contract
    /// # Returns
    /// * AccountId of the current role manager
    pub fn permissions_manager(&self) -> AccountId {
        self.permissions_manager.clone()
    }

    // User permissions

    /// Adds permissions to a user
    /// # Arguments
    /// * `user` - User account ID
    /// * `permissions` - Permissions to add
    /// # Panics
    /// Panics if caller is not the permissions manager
    pub fn add_permissions_to_user(&mut self, user: String, permissions: Vec<FaPermission>) {
        self.only_permissions_manager();
        let user_perms = self.user_permissions.entry(user).or_insert_with(Vec::new);
        user_perms.extend(permissions);
    }

    /// Gets the permissions for a user
    /// # Arguments
    /// * `user` - User account ID
    /// # Returns
    /// * Permissions for the user
    pub fn get_permissions_for_user(&self, user: String) -> Vec<FaPermission> {
        self.user_permissions.get(&user).cloned().unwrap_or_default()
    }

    /// Removes permissions from a user
    /// # Arguments
    /// * `user` - User account ID
    /// * `permissions` - Permissions to remove
    /// # Panics
    /// Panics if caller is not the permissions manager
    pub fn remove_permissions_from_user(&mut self, user: String, permissions: Vec<FaPermission>) {
        self.only_permissions_manager();
        if let Some(user_perms) = self.user_permissions.get_mut(&user) {
            for permission in permissions {
                user_perms.retain(|p| p.name != permission.name);
            }
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
    fn owner() {
        let contract = FaPermissions { owner: env::current_account_id(), permissions_manager: env::current_account_id(), user_permissions: HashMap::new() };
        assert_eq!(contract.owner(), env::current_account_id());
    }

    #[test]
    fn permissions_manager() {
        let contract = FaPermissions { owner: env::current_account_id(), permissions_manager: env::current_account_id(), user_permissions: HashMap::new() };
        assert_eq!(contract.permissions_manager(), env::current_account_id());
    }
}
