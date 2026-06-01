/**
 * Fixture builders for transaction and delegate-action payloads.
 *
 * Encoding goes through NEAR's *production* encoders (`encodeTransaction` /
 * `encodeDelegateAction` from @near-js/transactions), the exact same wire-format
 * serializers the SDK uses when it puts a payload on the Auth0 query string. The
 * decoding side under test (`parseTransaction` / `decodeDelegateAction`, the latter
 * driven by the action's hand-written borsh SCHEMA) therefore validates against real
 * NEAR bytes rather than bytes produced by the same schema it decodes with — closing
 * the round-trip honestly instead of circularly.
 *
 * The public builder API speaks in *decoded shapes* (`{ transfer: { deposit } }`,
 * `{ ed25519Key: { data } }`). Those shapes double as override inputs here and as the
 * objects fed directly to the form helpers in helpers.spec. Internally each descriptor
 * is converted to a near-api Action/PublicKey/Signature instance just before encoding.
 */
const {
    actionCreators,
    createTransaction,
    encodeTransaction,
    buildDelegateAction: nearBuildDelegateAction,
    encodeDelegateAction,
    Signature,
    GlobalContractDeployMode,
    GlobalContractIdentifier,
} = require("@near-js/transactions");
const { PublicKey } = require("near-api-js").utils;

// jest-environment-jsdom (jest 29) ships an older jsdom without TextEncoder. Fall back to util.
const SafeTextEncoder = typeof TextEncoder !== "undefined" ? TextEncoder : require("util").TextEncoder;

// Prefix for MetaTransactions NEP (366) offset by 2^30, matching @near-js/transactions.
const DELEGATE_ACTION_PREFIX = Math.pow(2, 30) + 366;

const ZERO_BLOCK_HASH = new Uint8Array(32);
const SAMPLE_BLOCK_HASH = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 7) % 256));

// ----- public descriptors (decoded shapes) -----

function ed25519PublicKey(seed = 1) {
    return {
        ed25519Key: { data: Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i + seed) % 256)) },
    };
}

function secp256k1PublicKey(seed = 2) {
    return {
        secp256k1Key: { data: Uint8Array.from(Array.from({ length: 64 }, (_, i) => (i + seed) % 256)) },
    };
}

function ed25519Signature(seed = 3) {
    return {
        ed25519Signature: { data: Uint8Array.from(Array.from({ length: 64 }, (_, i) => (i + seed) % 256)) },
    };
}

const buildAction = {
    createAccount() {
        return { createAccount: {} };
    },
    deployContract(overrides = {}) {
        const code = overrides.code || Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
        return { deployContract: { code } };
    },
    functionCall(overrides = {}) {
        return {
            functionCall: {
                methodName: overrides.methodName || "ft_transfer",
                args: overrides.args || Uint8Array.from(new SafeTextEncoder().encode('{"receiver_id":"bob.near","amount":"1"}')),
                gas: overrides.gas != null ? BigInt(overrides.gas) : BigInt("30000000000000"),
                deposit: overrides.deposit != null ? BigInt(overrides.deposit) : BigInt(1),
            },
        };
    },
    transfer(overrides = {}) {
        return {
            transfer: {
                deposit: overrides.deposit != null ? BigInt(overrides.deposit) : BigInt("1500000000000000000000000"), // 1.5 NEAR
            },
        };
    },
    stake(overrides = {}) {
        return {
            stake: {
                stake: overrides.stake != null ? BigInt(overrides.stake) : BigInt("1000000000000000000000000"),
                publicKey: overrides.publicKey || ed25519PublicKey(10),
            },
        };
    },
    addKeyFullAccess(overrides = {}) {
        return {
            addKey: {
                publicKey: overrides.publicKey || ed25519PublicKey(20),
                accessKey: {
                    nonce: overrides.nonce != null ? BigInt(overrides.nonce) : BigInt(0),
                    permission: { fullAccess: {} },
                },
            },
        };
    },
    addKeyFunctionCall(overrides = {}) {
        return {
            addKey: {
                publicKey: overrides.publicKey || ed25519PublicKey(21),
                accessKey: {
                    nonce: overrides.nonce != null ? BigInt(overrides.nonce) : BigInt(0),
                    permission: {
                        functionCall: {
                            allowance: overrides.allowance != null ? BigInt(overrides.allowance) : BigInt("1000000000000000000000000"),
                            receiverId: overrides.receiverId || "contract.near",
                            methodNames: overrides.methodNames || ["greet"],
                        },
                    },
                },
            },
        };
    },
    deleteKey(overrides = {}) {
        return { deleteKey: { publicKey: overrides.publicKey || ed25519PublicKey(30) } };
    },
    deleteAccount(overrides = {}) {
        return { deleteAccount: { beneficiaryId: overrides.beneficiaryId || "beneficiary.near" } };
    },
    signedDelegate(overrides = {}) {
        return {
            signedDelegate: {
                delegateAction: overrides.delegateAction || {
                    senderId: "alice.near",
                    receiverId: "bob.near",
                    actions: [buildAction.transfer()],
                    nonce: BigInt(1),
                    maxBlockHeight: BigInt(100),
                    publicKey: ed25519PublicKey(40),
                },
                signature: overrides.signature || ed25519Signature(),
            },
        };
    },
    deployGlobalContract(overrides = {}) {
        return {
            deployGlobalContract: {
                code: overrides.code || Uint8Array.from([9, 8, 7, 6, 5, 4]),
                deployMode: overrides.deployMode || { CodeHash: {} },
            },
        };
    },
    useGlobalContract(overrides = {}) {
        return {
            useGlobalContract: {
                contractIdentifier: overrides.contractIdentifier || { AccountId: "global.near" },
            },
        };
    },
};

// ----- descriptor → near-api instance converters -----

function toNearPublicKey(descriptor) {
    if (descriptor.ed25519Key) return new PublicKey({ keyType: 0, data: descriptor.ed25519Key.data });
    if (descriptor.secp256k1Key) return new PublicKey({ keyType: 1, data: descriptor.secp256k1Key.data });
    throw new Error("Unrecognized public key descriptor: " + JSON.stringify(Object.keys(descriptor)));
}

function toNearSignature(descriptor) {
    if (descriptor.ed25519Signature) return new Signature({ keyType: 0, data: descriptor.ed25519Signature.data });
    if (descriptor.secp256k1Signature) return new Signature({ keyType: 1, data: descriptor.secp256k1Signature.data });
    throw new Error("Unrecognized signature descriptor: " + JSON.stringify(Object.keys(descriptor)));
}

function toNearAccessKey(accessKey) {
    if (accessKey.permission.fullAccess) {
        return actionCreators.fullAccessKey();
    }
    const fc = accessKey.permission.functionCall;
    return actionCreators.functionCallAccessKey(fc.receiverId, fc.methodNames, fc.allowance);
}

function toNearAction(descriptor) {
    const key = Object.keys(descriptor)[0];
    const body = descriptor[key];
    switch (key) {
        case "createAccount":
            return actionCreators.createAccount();
        case "deployContract":
            return actionCreators.deployContract(body.code);
        case "functionCall":
            return actionCreators.functionCall(body.methodName, body.args, body.gas, body.deposit);
        case "transfer":
            return actionCreators.transfer(body.deposit);
        case "stake":
            return actionCreators.stake(body.stake, toNearPublicKey(body.publicKey));
        case "addKey":
            return actionCreators.addKey(toNearPublicKey(body.publicKey), toNearAccessKey(body.accessKey));
        case "deleteKey":
            return actionCreators.deleteKey(toNearPublicKey(body.publicKey));
        case "deleteAccount":
            return actionCreators.deleteAccount(body.beneficiaryId);
        case "signedDelegate":
            return actionCreators.signedDelegate({
                delegateAction: toNearDelegateAction(body.delegateAction),
                signature: toNearSignature(body.signature),
            });
        case "deployGlobalContract":
            return actionCreators.deployGlobalContract(body.code, new GlobalContractDeployMode(body.deployMode));
        case "useGlobalContract":
            return actionCreators.useGlobalContract(new GlobalContractIdentifier(body.contractIdentifier));
        default:
            throw new Error("Unrecognized action descriptor: " + key);
    }
}

function toNearDelegateAction(descriptor) {
    return nearBuildDelegateAction({
        senderId: descriptor.senderId,
        receiverId: descriptor.receiverId,
        actions: descriptor.actions.map(toNearAction),
        nonce: descriptor.nonce,
        maxBlockHeight: descriptor.maxBlockHeight,
        publicKey: toNearPublicKey(descriptor.publicKey),
    });
}

// ----- payload builders -----

function toCsv(bytes) {
    return Array.from(bytes).join(",");
}

function buildTransaction({
    signerId = "alice.near",
    publicKey = ed25519PublicKey(1),
    nonce = BigInt(1),
    receiverId = "bob.near",
    blockHash = SAMPLE_BLOCK_HASH,
    actions = [buildAction.transfer()],
} = {}) {
    const transaction = createTransaction(signerId, toNearPublicKey(publicKey), receiverId, nonce, actions.map(toNearAction), blockHash);
    const bytes = encodeTransaction(transaction);
    return { csv: toCsv(bytes), bytes, transaction };
}

function buildDelegateAction({
    senderId = "alice.near",
    receiverId = "bob.near",
    actions = [buildAction.transfer()],
    nonce = BigInt(1),
    maxBlockHeight = BigInt(100),
    publicKey = ed25519PublicKey(1),
} = {}) {
    const delegateAction = nearBuildDelegateAction({
        senderId,
        receiverId,
        actions: actions.map(toNearAction),
        nonce,
        maxBlockHeight,
        publicKey: toNearPublicKey(publicKey),
    });
    const bytes = encodeDelegateAction(delegateAction);
    return { csv: toCsv(bytes), bytes, delegateAction };
}

const ALL_ACTION_TYPES = [
    { name: "createAccount", build: () => buildAction.createAccount() },
    { name: "deployContract", build: () => buildAction.deployContract() },
    { name: "functionCall", build: () => buildAction.functionCall() },
    { name: "transfer", build: () => buildAction.transfer() },
    { name: "stake", build: () => buildAction.stake() },
    { name: "addKey (fullAccess)", build: () => buildAction.addKeyFullAccess() },
    { name: "addKey (functionCall)", build: () => buildAction.addKeyFunctionCall() },
    { name: "deleteKey", build: () => buildAction.deleteKey() },
    { name: "deleteAccount", build: () => buildAction.deleteAccount() },
    { name: "signedDelegate", build: () => buildAction.signedDelegate() },
    { name: "deployGlobalContract", build: () => buildAction.deployGlobalContract() },
    { name: "useGlobalContract", build: () => buildAction.useGlobalContract() },
];

// Delegate actions exclude action types that are themselves wrappers (signedDelegate, classic-only subset).
const DELEGATE_ACTION_TYPES = ALL_ACTION_TYPES.filter(
    (a) => !["signedDelegate", "deployGlobalContract", "useGlobalContract"].includes(a.name.split(" ")[0]),
);

module.exports = {
    DELEGATE_ACTION_PREFIX,
    ZERO_BLOCK_HASH,
    SAMPLE_BLOCK_HASH,
    ed25519PublicKey,
    secp256k1PublicKey,
    ed25519Signature,
    buildAction,
    buildTransaction,
    buildDelegateAction,
    toCsv,
    ALL_ACTION_TYPES,
    DELEGATE_ACTION_TYPES,
};
