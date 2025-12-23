use near_sdk::{near, AccountId};
use std::collections::{HashMap, HashSet};
use jwt_guard::{JwtPublicKey, assert_valid_public_key};
use crate::{
    error::FirebaseGuardError,
    require_err,
    utils::{assert_valid_account_id},
};
use super::Role;

#[near(serializers = [json])]
#[derive(Clone)]
pub struct FirebaseGuardConfig {
    pub issuer: String,
    pub public_keys: Vec<JwtPublicKey>,
    pub roles: RolesConfig,
}

impl FirebaseGuardConfig {
    /// Asserts that the config is valid
    /// # Arguments
    /// * `config` - The config
    /// # Panics
    /// * If the config is not valid
    pub fn assert_valid(&self) {
        // Public key validation
        for public_key in self.public_keys.iter() {
            assert_valid_public_key(public_key.clone());
        }
        // Roles validation
        self.roles.assert_valid();
    }
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct RolesConfig {
    pub super_admins: HashSet<AccountId>,
    pub admins: HashMap<Role, HashSet<AccountId>>,
    pub grantees: HashMap<Role, HashSet<AccountId>>,
}

impl RolesConfig {
    /// Asserts that the roles config is valid
    /// # Arguments
    /// * `roles` - The roles config
    /// # Panics
    /// * If the roles config is not valid
    pub fn assert_valid(&self) {
        require_err!(
            !self.super_admins.is_empty(),
            FirebaseGuardError::SuperAdminsMustBeNonEmpty
        );
        for super_admin in self.super_admins.iter() {
            assert_valid_account_id(&super_admin);
        }
        for account_ids in self.admins.values() {
            for account_id in account_ids.iter() {
                assert_valid_account_id(&account_id);
            }
        }
        for account_ids in self.grantees.values() {
            for account_id in account_ids.iter() {
                assert_valid_account_id(&account_id);
            }
        }
    }
}
