const { Transaction } = require("@near-js/transactions");
const { deserialize } = require("borsh");

// KEYS

const TRANSACTION_KEY = "transaction";
const DELEGATE_ACTION_KEY = "delegateAction";
const INTENT_KEY = "intent";

// NEP-413 CONSTANTS

/**
 * Domain-separation tag mandated by NEP-413 (2^31 + 413). It is prepended to every signed
 * off-chain message so the bytes can never be reinterpreted as a NEAR transaction, whose
 * borsh encoding starts with the signerId length — a small u32. Verifying this tag is what
 * keeps the new payload type from becoming a way to smuggle transaction bytes past the user.
 *
 * https://github.com/near/NEPs/blob/master/neps/nep-0413.md#how-to-ensure-the-message-is-not-a-transaction
 */
const NEP413_PREFIX_TAG = 2147484061;

/** Default verifier the intents are allowed to target when no secret is configured. */
const DEFAULT_INTENTS_RECIPIENT = "intents.near";

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
    /**
     * NEP-413 off-chain message payload. Field order is normative — it must match the
     * serializer the client signs with, or the recovered bytes will not match `fatxn`.
     * https://github.com/near/NEPs/blob/master/neps/nep-0413.md#input-interface
     */
    NEP413Payload = {
        struct: {
            tag: "u32",
            message: "string",
            nonce: { array: { type: "u8", len: 32 } },
            recipient: "string",
            callbackUrl: { option: "string" },
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

/**
 * Decode and validate a NEP-413 intent payload arriving on the authorize query string.
 *
 * Every check here is load-bearing for the security model. The guard contract only verifies
 * that `fatxn` equals the bytes the MPC is asked to sign — it never inspects them — so this
 * function is the only place that establishes *what* the user is being asked to approve:
 *
 *   1. The borsh payload must deserialize cleanly under the NEP-413 schema.
 *   2. The domain tag must be exactly NEP413_PREFIX_TAG, so the bytes cannot also be a valid
 *      NEAR transaction. Never trust the caller to have set it.
 *   3. The recipient must be the expected verifier, so a signed intent cannot be redirected
 *      to a different contract.
 *   4. The message must be JSON carrying a non-empty `intents` array — otherwise there is
 *      nothing meaningful to show the user, and an unrenderable payload must not be signed.
 *
 * @param {string} encodedIntent Comma-separated byte string from the query.
 * @param {string} expectedRecipient Verifier account the intents must target.
 * @returns {{payload: object, message: object}} The decoded payload and parsed message.
 * @throws {Error} With a user-facing reason when any check fails.
 */
function decodeIntent(encodedIntent, expectedRecipient) {
    const bytes = Uint8Array.from(String(encodedIntent).split(",").map((value) => Number(value)));

    let payload;
    try {
        payload = deserialize(SCHEMA.NEP413Payload, bytes);
    } catch (e) {
        throw new Error("Intent payload is not a valid NEP-413 message");
    }

    if (payload.tag !== NEP413_PREFIX_TAG) {
        throw new Error("Intent payload is missing the NEP-413 domain tag");
    }

    if (payload.recipient !== expectedRecipient) {
        throw new Error(`Intent payload targets an unexpected recipient: ${payload.recipient}`);
    }

    let message;
    try {
        message = JSON.parse(payload.message);
    } catch (e) {
        throw new Error("Intent message is not valid JSON");
    }

    if (!message || !Array.isArray(message.intents) || message.intents.length === 0) {
        throw new Error("Intent message carries no intents to approve");
    }

    return { payload, message };
}

function stringifyIntents(intents) {
    return JSON.stringify(intents, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2);
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
    const hasIntentParams = INTENT_KEY in query;
    const payloadCount = [hasTxParams, hasDelegateParams, hasIntentParams].filter(Boolean).length;
    const hasSigningPayload = payloadCount > 0;

    if (isOnchainAudience && !hasSigningPayload) {
        return api.access.deny("Signing audience requested without transaction payload");
    }
    if (!isOnchainAudience && hasSigningPayload) {
        return api.access.deny("Transaction payload only allowed with signing audience");
    }
    if (!isOnchainAudience) return;

    // Exactly one payload may be present. Accepting several and silently picking by precedence
    // would let a caller show the user one payload while a different one lands in `fatxn`.
    if (payloadCount > 1) {
        return api.access.deny("Only one signing payload may be requested at a time");
    }

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
        api.prompt.render(event.secrets.TRANSACTION_FORM, {
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
    } else if (hasDelegateParams) {
        const delegateAction = decodeDelegateAction(query.delegateAction);
        api.prompt.render(event.secrets.DELEGATE_ACTION_FORM, {
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
    } else {
        const expectedRecipient = event.secrets.INTENTS_RECIPIENT || DEFAULT_INTENTS_RECIPIENT;

        let decoded;
        try {
            decoded = decodeIntent(query.intent, expectedRecipient);
        } catch (error) {
            // A payload we cannot decode is a payload we cannot show the user. Signing it would
            // break the consent guarantee the whole flow rests on, so refuse instead.
            return api.access.deny(error.message);
        }

        const { payload, message } = decoded;
        api.prompt.render(event.secrets.INTENT_FORM, {
            fields: {
                ...branding,
                signerId: message.signer_id ?? "",
                recipient: payload.recipient,
                deadline: message.deadline ?? "",
                intents: stringifyIntents(message.intents),
            },
        });
        api.accessToken.setCustomClaim(
            "fatxn",
            query.intent.split(",").map((value) => Number(value)),
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
exports.onContinuePostLogin = async (event, api) => {
    // The decision form (see shared/decision) writes the user's choice into the `decision`
    // hidden field, which the runtime surfaces here as event.prompt.fields.decision.
    if (event.prompt?.fields?.decision === "denied") {
        return api.access.deny("User rejected the signing request");
    }
};

// Exports for testing. Auth0's action runtime only invokes `onExecutePostLogin` /
// `onContinuePostLogin`; extra exports are inert in production.
exports.parseTransaction = parseTransaction;
exports.decodeDelegateAction = decodeDelegateAction;
exports.decodeIntent = decodeIntent;
exports.stringifyActions = stringifyActions;
exports.stringifyIntents = stringifyIntents;
exports.SCHEMA = SCHEMA;
exports.NEP413_PREFIX_TAG = NEP413_PREFIX_TAG;
exports.DEFAULT_INTENTS_RECIPIENT = DEFAULT_INTENTS_RECIPIENT;
