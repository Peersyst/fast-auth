use crate::{CustomIssuerGuard};
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds};
use near_sdk::{assert_one_yocto, env, log, AccountId, NearToken, Promise};

impl CustomIssuerGuard {
    /// Internal method that returns the Account ID and the balance in case the account was
    /// unregistered.
    pub(crate) fn internal_storage_unregister(
        &mut self,
    ) -> bool {
        assert_one_yocto();
        let account_id = env::predecessor_account_id();
        if let Some(_jwt_hash) = self.jwt_claims.get(&account_id) {
            self.jwt_claims.remove(&account_id);
            let _ = Promise::new(account_id.clone()).transfer(
                self.internal_storage_balance_bounds().min.saturating_add(NearToken::from_yoctonear(1)),
            );
            true
        } else {
            log!("The account {} is not registered", &account_id);
            false
        }
    }

    /// Internal method that returns the storage balance of an account.
    pub(crate) fn internal_storage_balance_of(&self, account_id: &AccountId) -> Option<StorageBalance> {
        if self.jwt_claims.contains_key(account_id) {
            Some(StorageBalance {
                total: self.internal_storage_balance_bounds().min,
                available: NearToken::from_near(0),
            })
        } else {
            None
        }
    }

    /// Internal method that registers an account with the contract.
    pub(crate) fn internal_register_account(&mut self, account_id: &AccountId) {
        if self.jwt_claims.insert(account_id.clone(), vec![0u8; 32]).is_some() {
            env::panic_str("The account is already registered");
        }
    }

    /// Internal method that registers the storage deposit
    pub(crate) fn internal_storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
    ) -> StorageBalance {
        let amount = env::attached_deposit();
        let account_id = account_id.unwrap_or_else(env::predecessor_account_id);
        if self.jwt_claims.contains_key(&account_id) {
            log!("The account is already registered, refunding the deposit");
            if amount > NearToken::from_near(0) {
                let _ = Promise::new(env::predecessor_account_id()).transfer(amount);
            }
        } else {
            let min_balance = self.internal_storage_balance_bounds().min;
            if amount < min_balance {
                env::panic_str(format!("The attached deposit {} is less than the minimum storage balance {}", &amount, &min_balance).as_str());
            }

            self.internal_register_account(&account_id);
            let refund = amount.saturating_sub(min_balance);
            if refund > NearToken::from_near(0) {
                let _ = Promise::new(env::predecessor_account_id()).transfer(refund);
            }
        }
        self.internal_storage_balance_of(&account_id).unwrap()
    }

    /// While storage_withdraw normally allows the caller to retrieve `available` balance, the basic
    /// Fungible Token implementation sets storage_balance_bounds.min == storage_balance_bounds.max,
    /// which means available balance will always be 0. So this implementation:
    /// * panics if `amount > 0`
    /// * never transfers Ⓝ to caller
    /// * returns a `storage_balance` struct if `amount` is 0
    pub(crate) fn internal_storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        assert_one_yocto();
        let predecessor_account_id = env::predecessor_account_id();
        if let Some(storage_balance) = self.internal_storage_balance_of(&predecessor_account_id) {
            match amount {
                Some(amount) if amount > NearToken::from_near(0) => {
                    env::panic_str("The amount is greater than the available storage balance");
                }
                _ => storage_balance,
            }
        } else {
            env::panic_str(
                format!("The account {} is not registered", &predecessor_account_id).as_str(),
            );
        }
    }

    /// Internal method that returns the storage balance bounds for the contract.
    /// The minimum storage balance is equal to the storage cost of the contract's storage usage.
    pub(crate) fn internal_storage_balance_bounds(&self) -> StorageBalanceBounds {
        let required_storage_balance =
            env::storage_byte_cost().saturating_mul(self.account_storage_usage.into());
        StorageBalanceBounds { min: required_storage_balance, max: Some(required_storage_balance) }
    }
}
