// Find all our documentation at https://docs.near.org
use std::slice::Iter;

use near_plugins::{
    access_control, access_control_any, pause, AccessControlRole, AccessControllable, Pausable,
    Upgradable,
};
use near_sdk::{
    AccountId, BorshStorageKey, PanicOnDefault, borsh::{BorshDeserialize, BorshSerialize}, env, near, require, serde::{Deserialize, Serialize}, store::{IterableMap, Vector}
};
use schemars::JsonSchema;

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
pub enum Prefix {
    Attestations,
    PublicKeys,
}

#[near(serializers = [json, borsh])]
#[derive(AccessControlRole, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Role {
    DAO,
    Attester,
    CodeStager,
    CodeDeployer,
    DurationManager,
    PauseManager,
    UnpauseManager,
}

impl Role {
    pub fn iterator() -> Iter<'static, Role> {
        static ROLES: [Role; 7] = [
            Role::DAO,
            Role::Attester,
            Role::CodeStager,
            Role::CodeDeployer,
            Role::DurationManager,
            Role::PauseManager,
            Role::UnpauseManager,
        ];
        ROLES.iter()
    }
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct PublicKey {
    n: Vec<u8>,
    e: Vec<u8>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Attestation {
    hash: Vec<u8>,
    public_keys: Vec<PublicKey>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct RolesConfig {
    pub super_admins: Vec<AccountId>,
    pub admins: Vec<(Role, Vec<AccountId>)>,
    pub grantees: Vec<(Role, Vec<AccountId>)>,
}

// Define the contract structure  
#[access_control(role_type(Role))]
#[derive(PanicOnDefault, Pausable, Upgradable)]
#[pausable(
    pause_roles(Role::PauseManager, Role::DAO),
    unpause_roles(Role::UnpauseManager, Role::DAO)
)]
#[upgradable(access_control_roles(
    code_stagers(Role::CodeStager, Role::DAO),
    code_deployers(Role::CodeDeployer, Role::DAO),
    duration_initializers(Role::DurationManager, Role::DAO),
    duration_update_stagers(Role::DurationManager, Role::DAO),
    duration_update_appliers(Role::DurationManager, Role::DAO),
))]
#[near(contract_state)]
pub struct AttestationContract {
    attestations: IterableMap<AccountId, Attestation>,
    quorum: u32,
    public_keys: Vector<PublicKey>,
}

// Implement the contract structure
#[near]
impl AttestationContract {
    #[init]
    pub fn new(
        quorum: u32,
        super_admins: Vec<AccountId>,
        attesters: Vec<AccountId>,
    ) -> Self {
        require!(
            !env::state_exists(),
            "Contract is already initialized"
        );
        require!(quorum > 0, "Quorum must be greater than 0");
        require!(!super_admins.is_empty(), "Must have at least one super admin");
        
        let mut contract = Self {
            attestations: IterableMap::new(Prefix::Attestations),
            quorum,
            public_keys: Vector::new(Prefix::PublicKeys),
        };

        let mut acl = contract.acl_get_or_init();

        // Initialize super admins and grant them DAO role
        for super_admin in super_admins.iter() {
            require!(
                acl.add_super_admin_unchecked(super_admin),
                "Failed to initialize super admin"
            );
            // Grant DAO role to super admins so they can manage the contract
            require!(
                acl.grant_role_unchecked(Role::DAO, super_admin),
                "Failed to grant DAO role"
            );
        }
        
        // Grant attester role to initial attesters
        for attester in attesters {
            require!(
                acl.grant_role_unchecked(Role::Attester, &attester),
                "Failed to grant attester role"
            );
        }
        
        contract
    }

    // Only accounts with Attester role can call this
    #[pause]
    #[access_control_any(roles(Role::Attester, Role::DAO))]
    pub fn attest_keys(&mut self, public_keys: Vec<PublicKey>) {
        let caller = env::predecessor_account_id();
        
        // Compute SHA256 hash of the public keys
        let hash = self.compute_public_keys_hash(&public_keys);
        
        // Store attestation for this attester
        let attestation = Attestation {
            hash: hash.clone(),
            public_keys: public_keys.clone(),
        };
        self.attestations.insert(caller, attestation);
        
        // Count how many attestations match this hash
        let matching_count = self.attestations
            .iter()
            .filter(|(_, attestation)| attestation.hash == hash)
            .count() as u32;
        
        // If quorum is reached, update public keys and reset attestations
        if matching_count >= self.quorum {
            // Clear existing public keys
            self.public_keys.clear();
            
            // Set new public keys
            for pk in public_keys {
                self.public_keys.push(pk);
            }
            
            // Reset attestations
            self.attestations.clear();
        }
    }

    pub fn get_public_keys(&self) -> Vec<PublicKey> {
        self.public_keys.iter().cloned().collect()
    }

    pub fn get_attestation(&self, account_id: AccountId) -> Option<Attestation> {
        self.attestations.get(&account_id).cloned()
    }

    pub fn get_quorum(&self) -> u32 {
        self.quorum
    }

    pub fn get_attesters(&self, from_index: u64, limit: u64) -> Vec<AccountId> {
        self.acl_get_grantees("Attester".to_string(), from_index, limit)
    }

    // DAO-only method to update quorum
    #[pause]
    #[access_control_any(roles(Role::DAO))]
    pub fn set_quorum(&mut self, quorum: u32) {
        require!(quorum > 0, "Quorum must be greater than 0");
        self.quorum = quorum;
    }

    // Helper function to compute hash of public keys
    fn compute_public_keys_hash(&self, public_keys: &[PublicKey]) -> Vec<u8> {
        let mut data = Vec::new();
        for pk in public_keys {
            data.extend_from_slice(&pk.n);
            data.extend_from_slice(&pk.e);
        }
        env::sha256(&data).to_vec()
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    fn setup_contract() -> (AttestationContract, AccountId, AccountId, AccountId) {
        let dao: AccountId = "dao.near".parse().unwrap();
        let attester1: AccountId = "attester1.near".parse().unwrap();
        let attester2: AccountId = "attester2.near".parse().unwrap();
        
        let context = get_context(dao.clone());
        testing_env!(context.build());
        
        let contract = AttestationContract::new(
            2,
            vec![dao.clone()],
            vec![attester1.clone(), attester2.clone()],
        );
        
        (contract, dao, attester1, attester2)
    }

    #[test]
    fn test_new_contract() {
        let dao: AccountId = "dao.near".parse().unwrap();
        let attester1: AccountId = "attester1.near".parse().unwrap();
        let attester2: AccountId = "attester2.near".parse().unwrap();
        
        let context = get_context(dao.clone());
        testing_env!(context.build());
        
        let contract = AttestationContract::new(
            2,
            vec![dao.clone()],
            vec![attester1.clone(), attester2.clone()],
        );
        
        // Test initial state
        assert_eq!(contract.get_quorum(), 2);
        let attesters = contract.get_attesters(0, 10);
        assert_eq!(attesters.len(), 2);
        assert_eq!(contract.get_public_keys().len(), 0);
        
        // Verify attesters are in the set
        assert!(attesters.contains(&attester1));
        assert!(attesters.contains(&attester2));
        
        // Verify DAO is super admin
        let super_admins = contract.acl_get_super_admins(0, 10);
        assert!(super_admins.contains(&dao));
    }

    #[test]
    fn test_get_quorum() {
        let (contract, _, _, _) = setup_contract();
        assert_eq!(contract.get_quorum(), 2);
    }

    #[test]
    fn test_get_public_keys_empty() {
        let (contract, _, _, _) = setup_contract();
        assert_eq!(contract.get_public_keys().len(), 0);
    }

    #[test]
    fn test_get_attesters() {
        let (contract, _, attester1, attester2) = setup_contract();
        let attesters = contract.get_attesters(0, 10);
        assert_eq!(attesters.len(), 2);
        assert!(attesters.contains(&attester1));
        assert!(attesters.contains(&attester2));
    }

    #[test]
    fn test_attest_keys_single_attester_below_quorum() {
        let (mut contract, _, attester1, _) = setup_contract();
        
        let context = get_context(attester1.clone());
        testing_env!(context.build());
        
        let public_keys = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        contract.attest_keys(public_keys.clone());
        
        // Attestation should be stored
        assert!(contract.get_attestation(attester1.clone()).is_some());
        
        // But public keys should NOT be set yet (quorum is 2)
        assert_eq!(contract.get_public_keys().len(), 0);
    }

    #[test]
    fn test_attest_keys_reaches_quorum() {
        let (mut contract, _, attester1, attester2) = setup_contract();
        
        let public_keys = vec![
            PublicKey {
                n: vec![1, 2, 3],
                e: vec![4, 5, 6],
            },
            PublicKey {
                n: vec![7, 8, 9],
                e: vec![10, 11, 12],
            },
        ];
        
        // First attester attests
        let context = get_context(attester1.clone());
        testing_env!(context.build());
        contract.attest_keys(public_keys.clone());
        
        // Public keys should NOT be set yet
        assert_eq!(contract.get_public_keys().len(), 0);
        
        // Second attester attests with same keys
        let context = get_context(attester2.clone());
        testing_env!(context.build());
        contract.attest_keys(public_keys.clone());
        
        // Now public keys SHOULD be set (quorum reached)
        assert_eq!(contract.get_public_keys().len(), 2);
        assert_eq!(contract.get_public_keys()[0].n, vec![1, 2, 3]);
        assert_eq!(contract.get_public_keys()[1].n, vec![7, 8, 9]);
        
        // Attestations should be cleared after quorum
        assert!(contract.get_attestation(attester1).is_none());
        assert!(contract.get_attestation(attester2).is_none());
    }

    #[test]
    fn test_attest_keys_different_hashes() {
        let (mut contract, _, attester1, attester2) = setup_contract();
        
        let public_keys1 = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        let public_keys2 = vec![PublicKey {
            n: vec![7, 8, 9],
            e: vec![10, 11, 12],
        }];
        
        // First attester attests with keys1
        let context = get_context(attester1.clone());
        testing_env!(context.build());
        contract.attest_keys(public_keys1);
        
        // Second attester attests with DIFFERENT keys
        let context = get_context(attester2.clone());
        testing_env!(context.build());
        contract.attest_keys(public_keys2);
        
        // Public keys should NOT be set (different hashes)
        assert_eq!(contract.get_public_keys().len(), 0);
        
        // Both attestations should exist
        assert!(contract.get_attestation(attester1).is_some());
        assert!(contract.get_attestation(attester2).is_some());
    }

    #[test]
    #[should_panic(expected = "Insufficient permissions")]
    fn test_attest_keys_without_role() {
        let (mut contract, _, _, _) = setup_contract();
        let non_attester: AccountId = "hacker.near".parse().unwrap();
        
        let context = get_context(non_attester);
        testing_env!(context.build());
        
        let public_keys = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        // This should panic with insufficient permissions
        contract.attest_keys(public_keys);
    }

    #[test]
    fn test_get_attestation() {
        let (mut contract, _, attester1, attester2) = setup_contract();
        
        let public_keys = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        let context = get_context(attester1.clone());
        testing_env!(context.build());
        contract.attest_keys(public_keys);
        
        // Should have attestation for attester1
        let attestation = contract.get_attestation(attester1);
        assert!(attestation.is_some());
        assert!(!attestation.unwrap().hash.is_empty());
        
        // Should NOT have attestation for attester2
        assert!(contract.get_attestation(attester2).is_none());
    }

    #[test]
    fn test_set_quorum_as_dao() {
        let (mut contract, dao, _, _) = setup_contract();
        
        let context = get_context(dao);
        testing_env!(context.build());
        
        contract.set_quorum(3);
        assert_eq!(contract.get_quorum(), 3);
    }

    #[test]
    #[should_panic(expected = "Insufficient permissions")]
    fn test_set_quorum_not_dao() {
        let (mut contract, _, attester1, _) = setup_contract();
        
        let context = get_context(attester1);
        testing_env!(context.build());
        
        // This should panic
        contract.set_quorum(3);
    }

    #[test]
    fn test_super_admin_management() {
        let (mut contract, dao, _, _) = setup_contract();
        let new_admin: AccountId = "newadmin.near".parse().unwrap();
        
        let context = get_context(dao.clone());
        testing_env!(context.build());
        
        // Add new super admin
        contract.acl_add_super_admin(new_admin.clone());
        let super_admins = contract.acl_get_super_admins(0, 10);
        assert!(super_admins.contains(&new_admin));
        
        // Remove super admin
        contract.acl_revoke_super_admin(new_admin.clone());
        let super_admins = contract.acl_get_super_admins(0, 10);
        assert!(!super_admins.contains(&new_admin));
    }

    #[test]
    fn test_add_and_remove_attester() {
        let (mut contract, dao, _, _) = setup_contract();
        let new_attester: AccountId = "newattester.near".parse().unwrap();
        
        let context = get_context(dao.clone());
        testing_env!(context.build());
        
        // Add attester
        contract.acl_grant_role("Attester".to_string(), new_attester.clone());
        let attesters = contract.get_attesters(0, 10);
        assert_eq!(attesters.len(), 3);
        assert!(attesters.contains(&new_attester));
        
        // Remove attester
        contract.acl_revoke_role("Attester".to_string(), new_attester.clone());
        let attesters = contract.get_attesters(0, 10);
        assert_eq!(attesters.len(), 2);
        assert!(!attesters.contains(&new_attester));
    }

    #[test]
    fn test_attest_keys_updates_existing_attestation() {
        let (mut contract, _, attester1, _) = setup_contract();
        
        let public_keys1 = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        let public_keys2 = vec![PublicKey {
            n: vec![7, 8, 9],
            e: vec![10, 11, 12],
        }];
        
        let context = get_context(attester1.clone());
        testing_env!(context.build());
        
        // First attestation
        contract.attest_keys(public_keys1);
        let attestation1 = contract.get_attestation(attester1.clone()).unwrap();
        
        // Second attestation (should update)
        contract.attest_keys(public_keys2);
        let attestation2 = contract.get_attestation(attester1.clone()).unwrap();
        
        // Hashes should be different
        assert_ne!(attestation1.hash, attestation2.hash);
    }

    #[test]
    fn test_quorum_of_one() {
        let dao: AccountId = "dao.near".parse().unwrap();
        let attester: AccountId = "attester.near".parse().unwrap();
        
        let context = get_context(dao.clone());
        testing_env!(context.build());
        
        let mut contract = AttestationContract::new(
            1,
            vec![dao.clone()],
            vec![attester.clone()],
        );
        
        let public_keys = vec![PublicKey {
            n: vec![1, 2, 3],
            e: vec![4, 5, 6],
        }];
        
        let context = get_context(attester);
        testing_env!(context.build());
        
        // Should immediately set public keys with quorum of 1
        contract.attest_keys(public_keys);
        assert_eq!(contract.get_public_keys().len(), 1);
    }
}
