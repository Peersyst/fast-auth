const { Transaction } = require("@near-js/transactions");
const { deserialize } = require("borsh");

// KEYS

const TRANSACTION_KEY = "transaction";
const IMAGE_URL_KEY = "imageUrl";
const NAME_KEY = "name";
const DELEGATE_ACTION_KEY = "delegateAction";

// SCHEMA definitions
const SCHEMA = new (class BorshSchema {
    Ed25519Signature = {
        struct: {
            data: { array: { type: "u8", len: 64 } },
        },
    };
    Secp256k1Signature = {
        struct: {
            data: { array: { type: "u8", len: 65 } },
        },
    };
    Signature = {
        enum: [{ struct: { ed25519Signature: this.Ed25519Signature } }, { struct: { secp256k1Signature: this.Secp256k1Signature } }],
    };
    Ed25519Data = {
        struct: {
            data: { array: { type: "u8", len: 32 } },
        },
    };
    Secp256k1Data = {
        struct: {
            data: { array: { type: "u8", len: 64 } },
        },
    };
    PublicKey = {
        enum: [{ struct: { ed25519Key: this.Ed25519Data } }, { struct: { secp256k1Key: this.Secp256k1Data } }],
    };
    FunctionCallPermission = {
        struct: {
            allowance: { option: "u128" },
            receiverId: "string",
            methodNames: { array: { type: "string" } },
        },
    };
    FullAccessPermission = {
        struct: {},
    };
    AccessKeyPermission = {
        enum: [{ struct: { functionCall: this.FunctionCallPermission } }, { struct: { fullAccess: this.FullAccessPermission } }],
    };
    AccessKey = {
        struct: {
            nonce: "u64",
            permission: this.AccessKeyPermission,
        },
    };
    CreateAccount = {
        struct: {},
    };
    DeployContract = {
        struct: {
            code: { array: { type: "u8" } },
        },
    };
    FunctionCall = {
        struct: {
            methodName: "string",
            args: { array: { type: "u8" } },
            gas: "u64",
            deposit: "u128",
        },
    };
    Transfer = {
        struct: {
            deposit: "u128",
        },
    };
    Stake = {
        struct: {
            stake: "u128",
            publicKey: this.PublicKey,
        },
    };
    AddKey = {
        struct: {
            publicKey: this.PublicKey,
            accessKey: this.AccessKey,
        },
    };
    DeleteKey = {
        struct: {
            publicKey: this.PublicKey,
        },
    };
    DeleteAccount = {
        struct: {
            beneficiaryId: "string",
        },
    };
    DelegateActionPrefix = {
        struct: {
            prefix: "u32",
        },
    };
    ClassicActions = {
        enum: [
            { struct: { createAccount: this.CreateAccount } },
            { struct: { deployContract: this.DeployContract } },
            { struct: { functionCall: this.FunctionCall } },
            { struct: { transfer: this.Transfer } },
            { struct: { stake: this.Stake } },
            { struct: { addKey: this.AddKey } },
            { struct: { deleteKey: this.DeleteKey } },
            { struct: { deleteAccount: this.DeleteAccount } },
        ],
    };
    DelegateAction = {
        struct: {
            senderId: "string",
            receiverId: "string",
            actions: { array: { type: this.ClassicActions } },
            nonce: "u64",
            maxBlockHeight: "u64",
            publicKey: this.PublicKey,
        },
    };
    SignedDelegate = {
        struct: {
            delegateAction: this.DelegateAction,
            signature: this.Signature,
        },
    };
    GlobalContractDeployMode = {
        enum: [{ struct: { CodeHash: { struct: {} } } }, { struct: { AccountId: { struct: {} } } }],
    };
    GlobalContractIdentifier = {
        enum: [{ struct: { CodeHash: { array: { type: "u8", len: 32 } } } }, { struct: { AccountId: "string" } }],
    };
    DeployGlobalContract = {
        struct: {
            code: { array: { type: "u8" } },
            deployMode: this.GlobalContractDeployMode,
        },
    };
    UseGlobalContract = {
        struct: {
            contractIdentifier: this.GlobalContractIdentifier,
        },
    };
    Action = {
        enum: [
            { struct: { createAccount: this.CreateAccount } },
            { struct: { deployContract: this.DeployContract } },
            { struct: { functionCall: this.FunctionCall } },
            { struct: { transfer: this.Transfer } },
            { struct: { stake: this.Stake } },
            { struct: { addKey: this.AddKey } },
            { struct: { deleteKey: this.DeleteKey } },
            { struct: { deleteAccount: this.DeleteAccount } },
            { struct: { signedDelegate: this.SignedDelegate } },
            { struct: { deployGlobalContract: this.DeployGlobalContract } },
            { struct: { useGlobalContract: this.UseGlobalContract } },
        ],
    };
    Transaction = {
        struct: {
            signerId: "string",
            publicKey: this.PublicKey,
            nonce: "u64",
            receiverId: "string",
            blockHash: { array: { type: "u8", len: 32 } },
            actions: { array: { type: this.Action } },
        },
    };
    SignedTransaction = {
        struct: {
            transaction: this.Transaction,
            signature: this.Signature,
        },
    };
})();

// UTILS

function hasKeys(query, keys) {
    return keys.every((k) => k in query);
}

function parseTransaction(txString) {
    return Transaction.decode(Uint8Array.from(txString.split(",").map((value) => Number(value))));
}

function decodeDelegateAction(encodedDelegateAction) {
    encodedDelegateAction = Uint8Array.from(encodedDelegateAction.split(",").map((value) => Number(value)));
    // Create a view of the data for parsing
    let offset = 0;

    // First, deserialize the DelegateActionPrefix
    // The prefix is a u32, so it should consume 4 bytes
    const prefixBytes = encodedDelegateAction.slice(offset, offset + 4);
    const prefix = deserialize(SCHEMA.DelegateActionPrefix, prefixBytes);
    offset += 4;

    // Now deserialize the actual DelegateAction from the remaining bytes
    const delegateActionBytes = encodedDelegateAction.slice(offset);
    const delegateAction = deserialize(SCHEMA.DelegateAction, delegateActionBytes);

    return delegateAction;
}

function stringifyActions(actions) {
    return JSON.stringify(
        actions,
        (_, value) => {
            if (typeof value == "bigint") {
                return value.toString();
            }
            return value;
        },
        2,
    );
}

// HANDLERS

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
    const query = event.request.query;

    if (hasKeys(query, [TRANSACTION_KEY, IMAGE_URL_KEY, NAME_KEY])) {
        const transaction = parseTransaction(event.request.query.transaction);
        console.log(transaction.publicKey, transaction.actions);
        api.prompt.render(event.secrets.authorize_app_modal, {
            fields: {
                imageUrl: event.request.query.imageUrl,
                name: event.request.query.name,
                receiverId: transaction.receiverId,
                signerId: transaction.signerId,
                actions: stringifyActions(transaction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            event.request.query.transaction.split(",").map((value) => Number(value)),
        );
    } else if (hasKeys(query, [DELEGATE_ACTION_KEY, IMAGE_URL_KEY, NAME_KEY])) {
        const delegateAction = decodeDelegateAction(event.request.query.delegateAction);
        api.prompt.render(event.secrets.delegate_action_modal, {
            fields: {
                imageUrl: event.request.query.imageUrl,
                name: event.request.query.name,
                receiverId: delegateAction.receiverId,
                senderId: delegateAction.senderId,
                maxBlockHeight: delegateAction.maxBlockHeight.toString(),
                actions: stringifyActions(delegateAction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            event.request.query.delegateAction.split(",").map((value) => Number(value)),
        );
    }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onContinuePostLogin = async (event, api) => {};
