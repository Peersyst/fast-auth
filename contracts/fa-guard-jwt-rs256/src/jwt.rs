use serde::{Deserialize, Serialize};
use near_sdk::{AccountId, CryptoHash, PublicKey, Gas, Nonce};
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use serde_with::serde_as;
use serde_with::base64::Base64;

/// Custom claims structure for FastAuth JWT tokens
#[derive(Serialize, Deserialize)]
pub struct FaJwtCustomClaims {
    /// The FastAuth permissions claim that specifies what actions are allowed
    pub fatxn: Vec<u8>,
    /// The subject identifier claim that uniquely identifies the user
    pub sub: String,
}

#[derive(
    BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq, 
)]
pub struct Transaction {
    /// An account on which behalf transaction is signed
    pub signerId: AccountId,
    /// A public key of the access key which was used to sign an account.
    /// Access key holds permissions for calling certain kinds of actions.
    pub publicKey: PublicKey,
    /// Nonce is used to determine order of transaction in the pool.
    /// It increments for a combination of `signer_id` and `public_key`
    pub nonce: Nonce,
    /// Receiver account for this transaction
    pub receiverId: AccountId,
    /// The hash of the block in the blockchain on top of which the given transaction is valid
    pub blockHash: CryptoHash,
    /// A list of actions to be applied
    pub actions: Vec<Action>,
}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Serialize,
    Deserialize,
)]
pub enum Action {
    /// Create an (sub)account using a transaction `receiver_id` as an ID for
    /// a new account ID must pass validation rules described here
    /// <http://nomicon.io/Primitives/Account.html>.
    CreateAccount(CreateAccountAction),
    /// Sets a Wasm code to a receiver_id
    DeployContract(DeployContractAction),
    FunctionCall(Box<FunctionCallAction>),
    Transfer(TransferAction),
    Stake(Box<StakeAction>),
    AddKey(Box<AddKeyAction>),
    DeleteKey(Box<DeleteKeyAction>),
    DeleteAccount(DeleteAccountAction),
}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    Serialize,
    Deserialize,
)]
pub struct AccessKey {
    pub accountId: AccountId,
    pub publicKey: PublicKey,
}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    Serialize,
    Deserialize,
)]
pub struct AddKeyAction {
    /// A public key which will be associated with an access_key
    pub publicKey: PublicKey,
    /// An access key with the permission
    pub accessKey: AccessKey,
}

/// Create account action
#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    serde::Serialize,
    serde::Deserialize,
)]
pub struct CreateAccountAction {}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    serde::Serialize,
    serde::Deserialize,
)]
pub struct DeleteAccountAction {
    pub beneficiaryId: AccountId,
}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    serde::Serialize,
    serde::Deserialize,
)]
pub struct DeleteKeyAction {
    /// A public key associated with the access_key to be deleted.
    pub publicKey: PublicKey,
}

/// Deploy contract action
#[serde_as]
#[derive(
    BorshSerialize,
    BorshDeserialize,
    serde::Serialize,
    serde::Deserialize,
    PartialEq,
    Eq,
    Clone,
)]
pub struct DeployContractAction {
    /// WebAssembly binary
    #[serde_as(as = "Base64")]
    pub code: Vec<u8>,
}


#[serde_as]
#[derive(
    BorshSerialize,
    BorshDeserialize,
    serde::Serialize,
    serde::Deserialize,
    PartialEq,
    Eq,
    Clone,
)]
pub struct FunctionCallAction {
    pub methodName: String,
    #[serde_as(as = "Base64")]
    pub args: Vec<u8>,
    pub gas: Gas,
    #[serde(with = "dec_format")]
    pub deposit: u128,
}

/// An action which stakes signer_id tokens and setup's validator public key
#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    serde::Serialize,
    serde::Deserialize,
)]
pub struct StakeAction {
    /// Amount of tokens to stake.
    #[serde(with = "dec_format")]
    pub stake: u128,
    /// Validator key which will be used to sign transactions on behalf of signer_id
    pub publicKey: PublicKey,
}

#[derive(
    BorshSerialize,
    BorshDeserialize,
    PartialEq,
    Eq,
    Clone,
    Debug,
    serde::Serialize,
    serde::Deserialize,
)]
pub struct TransferAction {
    #[serde(with = "dec_format")]
    pub deposit: u128,
}

/// Serializes number as a string; deserializes either as a string or number.
///
/// This format works for `u64`, `u128`, `Option<u64>` and `Option<u128>` types.
/// When serializing, numbers are serialized as decimal strings.  When
/// deserializing, strings are parsed as decimal numbers while numbers are
/// interpreted as is.
pub mod dec_format {
    use serde::de;
    use serde::{Deserializer, Serializer};

    #[derive(thiserror::Error, Debug)]
    #[error("cannot parse from unit")]
    pub struct ParseUnitError;

    /// Abstraction between integers that we serialize.
    pub trait DecType: Sized {
        /// Formats number as a decimal string; passes `None` as is.
        fn serialize(&self) -> Option<String>;

        /// Constructs Self from a `null` value.  Returns error if this type
        /// does not accept `null` values.
        fn try_from_unit() -> Result<Self, ParseUnitError> {
            Err(ParseUnitError)
        }

        /// Tries to parse decimal string as an integer.
        fn try_from_str(value: &str) -> Result<Self, std::num::ParseIntError>;

        /// Constructs Self from a 64-bit unsigned integer.
        fn from_u64(value: u64) -> Self;
    }

    impl DecType for u64 {
        fn serialize(&self) -> Option<String> {
            Some(self.to_string())
        }
        fn try_from_str(value: &str) -> Result<Self, std::num::ParseIntError> {
            Self::from_str_radix(value, 10)
        }
        fn from_u64(value: u64) -> Self {
            value
        }
    }

    impl DecType for u128 {
        fn serialize(&self) -> Option<String> {
            Some(self.to_string())
        }
        fn try_from_str(value: &str) -> Result<Self, std::num::ParseIntError> {
            Self::from_str_radix(value, 10)
        }
        fn from_u64(value: u64) -> Self {
            value.into()
        }
    }

    impl<T: DecType> DecType for Option<T> {
        fn serialize(&self) -> Option<String> {
            self.as_ref().and_then(DecType::serialize)
        }
        fn try_from_unit() -> Result<Self, ParseUnitError> {
            Ok(None)
        }
        fn try_from_str(value: &str) -> Result<Self, std::num::ParseIntError> {
            Some(T::try_from_str(value)).transpose()
        }
        fn from_u64(value: u64) -> Self {
            Some(T::from_u64(value))
        }
    }

    struct Visitor<T>(core::marker::PhantomData<T>);

    impl<'de, T: DecType> de::Visitor<'de> for Visitor<T> {
        type Value = T;

        fn expecting(&self, fmt: &mut std::fmt::Formatter) -> std::fmt::Result {
            fmt.write_str("a non-negative integer as a string")
        }

        fn visit_unit<E: de::Error>(self) -> Result<T, E> {
            T::try_from_unit().map_err(|_| de::Error::invalid_type(de::Unexpected::Option, &self))
        }

        fn visit_u64<E: de::Error>(self, value: u64) -> Result<T, E> {
            Ok(T::from_u64(value))
        }

        fn visit_str<E: de::Error>(self, value: &str) -> Result<T, E> {
            T::try_from_str(value).map_err(de::Error::custom)
        }
    }

    pub fn deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
    where
        D: Deserializer<'de>,
        T: DecType,
    {
        deserializer.deserialize_any(Visitor(Default::default()))
    }

    pub fn serialize<S, T>(num: &T, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: DecType,
    {
        match num.serialize() {
            Some(value) => serializer.serialize_str(&value),
            None => serializer.serialize_none(),
        }
    }
}