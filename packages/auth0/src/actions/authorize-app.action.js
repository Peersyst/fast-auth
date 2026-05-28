const { Transaction } = require("@near-js/transactions");
const { deserialize } = require("borsh");

// KEYS

const TRANSACTION_KEY = "transaction";
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
    const onchainAudience = event.secrets.ONCHAIN_AUDIENCE;
    const query = event.request.query;
    const isOnchainAudience = event.resource_server?.identifier === onchainAudience;
    const hasTxParams = TRANSACTION_KEY in query;
    const hasDelegateParams = DELEGATE_ACTION_KEY in query;
    const hasSigningPayload = hasTxParams || hasDelegateParams;

    if (isOnchainAudience && !hasSigningPayload) {
        return api.access.deny("Signing audience requested without transaction payload");
    }
    if (!isOnchainAudience && hasSigningPayload) {
        return api.access.deny("Transaction payload only allowed with signing audience");
    }
    if (!isOnchainAudience) return;

    // Strip OIDC profile scopes from the issued access token.
    //
    // @auth0/auth0-spa-js unions per-call scope with its built-in default ("openid profile email"),
    // so the access token would otherwise carry profile+email and let /userinfo return the user's
    // email, name, picture and locale for the 60s of token validity.
    //
    // Constraints:
    //   - `scope` is a reserved claim and cannot be overridden via setCustomClaim (Auth0 throws
    //     'The "scope" claim cannot be set.'). The `removeScope` API is the supported path.
    //   - We cannot remove `openid` because Auth0 then declines to emit the id_token, and
    //     @auth0/auth0-spa-js hard-fails the callback with 'ID token is required but missing'.
    //     The hard check is non-configurable in the library.
    //
    // Net result: the signing token's `scope` is "openid transaction:sign". /userinfo is still
    // reachable but only returns `sub` (no email/name/picture). The `sub` is still the raw Google
    // identifier until D13 (hashed sub) lands, at which point /userinfo will only ever return a
    // privacy-preserving hash. See ADR D5 + D13.
    api.accessToken.removeScope("profile");
    api.accessToken.removeScope("email");
    api.accessToken.removeScope("offline_access");

    const branding = {
        imageUrl: event.client.metadata?.logo_uri ?? "",
        name: event.client.name,
    };

    if (hasTxParams) {
        const transaction = parseTransaction(query.transaction);
        api.prompt.render(event.secrets.authorize_app_modal, {
            fields: {
                ...branding,
                receiverId: transaction.receiverId,
                signerId: transaction.signerId,
                actions: stringifyActions(transaction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            query.transaction.split(",").map((value) => Number(value)),
        );
    } else {
        const delegateAction = decodeDelegateAction(query.delegateAction);
        api.prompt.render(event.secrets.delegate_action_modal, {
            fields: {
                ...branding,
                receiverId: delegateAction.receiverId,
                senderId: delegateAction.senderId,
                maxBlockHeight: delegateAction.maxBlockHeight.toString(),
                actions: stringifyActions(delegateAction.actions),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            query.delegateAction.split(",").map((value) => Number(value)),
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
