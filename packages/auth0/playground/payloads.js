/**
 * Vanilla-JS payload factories for the playground.
 *
 * Returns the SHAPE that `__auth0FormHelpers.renderDetails` expects after the Auth0 action has
 * decoded the borsh bytes — i.e. the JSON-stringified actions array that Auth0 hands to the form
 * runtime via fields.actions. This sidesteps borsh/near-api-js in the browser; for full round-trip
 * validation see test/decoding.spec.js, which serializes via borsh and runs the production
 * deserializer.
 */
(function (global) {
    "use strict";

    function bytes(len, seed) {
        const out = new Array(len);
        for (let i = 0; i < len; i++) out[i] = (i + seed) % 256;
        return out;
    }

    function ed25519PublicKey(seed = 1) {
        return { ed25519Key: { data: bytes(32, seed) } };
    }

    function secp256k1PublicKey(seed = 2) {
        return { secp256k1Key: { data: bytes(64, seed) } };
    }

    function ed25519Signature(seed = 3) {
        return { ed25519Signature: { data: bytes(64, seed) } };
    }

    function rand(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function randomAccount() {
        const names = ["alice", "bob", "charlie", "dao", "vault", "treasury", "swap", "pool"];
        const tlds = [".near", ".testnet", ".sputnik-dao.near", ".v2.ref-finance.near"];
        return names[rand(0, names.length)] + tlds[rand(0, tlds.length)];
    }

    function randomMethod() {
        const methods = ["ft_transfer", "ft_transfer_call", "nft_transfer", "swap", "vote", "stake", "withdraw", "deposit"];
        return methods[rand(0, methods.length)];
    }

    function randomDepositYocto(mode) {
        // Bias to amounts in the 0.1..1000 NEAR range for "preset" presets but allow micro values when fuzzed.
        if (mode === "fuzz" && Math.random() < 0.3) return String(rand(1, 10000));
        const ne = rand(1, 1000);
        const decimal = rand(0, 99);
        return (BigInt(ne) * BigInt("1000000000000000000000000") + BigInt(decimal) * BigInt("10000000000000000000000")).toString();
    }

    const ACTION_BUILDERS = {
        createAccount: function () {
            return { createAccount: {} };
        },
        deployContract: function (mode) {
            return { deployContract: { code: bytes(mode === "fuzz" ? rand(64, 1024) : 256, 7) } };
        },
        functionCall: function (mode) {
            const argsJson = JSON.stringify({ receiver_id: randomAccount(), amount: String(rand(1, 1000)) });
            return {
                functionCall: {
                    methodName: mode === "fuzz" ? randomMethod() : "ft_transfer",
                    args: Array.from(new TextEncoder().encode(argsJson)),
                    gas: String(BigInt(30) * BigInt("1000000000000")),
                    deposit: "1",
                },
            };
        },
        transfer: function (mode) {
            return { transfer: { deposit: randomDepositYocto(mode) } };
        },
        stake: function (mode) {
            return {
                stake: {
                    stake: randomDepositYocto(mode),
                    publicKey: ed25519PublicKey(rand(0, 250)),
                },
            };
        },
        "addKey (fullAccess)": function () {
            return {
                addKey: {
                    publicKey: ed25519PublicKey(20),
                    accessKey: { nonce: "0", permission: { fullAccess: {} } },
                },
            };
        },
        "addKey (functionCall)": function (mode) {
            return {
                addKey: {
                    publicKey: ed25519PublicKey(21),
                    accessKey: {
                        nonce: "0",
                        permission: {
                            functionCall: {
                                allowance: randomDepositYocto(mode),
                                receiverId: randomAccount(),
                                methodNames: mode === "fuzz" ? [randomMethod(), randomMethod()] : ["greet"],
                            },
                        },
                    },
                },
            };
        },
        deleteKey: function () {
            return { deleteKey: { publicKey: ed25519PublicKey(30) } };
        },
        deleteAccount: function () {
            return { deleteAccount: { beneficiaryId: randomAccount() } };
        },
        signedDelegate: function (mode) {
            return {
                signedDelegate: {
                    delegateAction: {
                        senderId: randomAccount(),
                        receiverId: randomAccount(),
                        actions: [ACTION_BUILDERS.transfer(mode)],
                        nonce: "1",
                        maxBlockHeight: "100",
                        publicKey: ed25519PublicKey(40),
                    },
                    signature: ed25519Signature(),
                },
            };
        },
        deployGlobalContract: function (mode) {
            return {
                deployGlobalContract: {
                    code: bytes(mode === "fuzz" ? rand(64, 512) : 128, 9),
                    deployMode: { CodeHash: {} },
                },
            };
        },
        useGlobalContract: function () {
            return { useGlobalContract: { contractIdentifier: { AccountId: randomAccount() } } };
        },
    };

    const ACTION_NAMES = Object.keys(ACTION_BUILDERS);
    // signedDelegate / global contract variants can't nest inside a delegate (NEP-366 limitation).
    const DELEGATE_ACTION_NAMES = ACTION_NAMES.filter(
        (n) => !["signedDelegate", "deployGlobalContract", "useGlobalContract"].includes(n),
    );

    function buildTransactionPayload(actionName, mode) {
        const action = ACTION_BUILDERS[actionName](mode);
        return {
            params: {
                signerId: randomAccount(),
                receiverId: randomAccount(),
                actions: JSON.stringify([action]),
            },
        };
    }

    function buildDelegateActionPayload(actionName, mode) {
        const action = ACTION_BUILDERS[actionName](mode);
        return {
            params: {
                senderId: randomAccount(),
                receiverId: randomAccount(),
                maxBlockHeight: String(rand(1000, 9999999)),
                actions: JSON.stringify([action]),
            },
        };
    }

    global.PlaygroundPayloads = {
        ACTION_NAMES: ACTION_NAMES,
        DELEGATE_ACTION_NAMES: DELEGATE_ACTION_NAMES,
        buildTransactionPayload: buildTransactionPayload,
        buildDelegateActionPayload: buildDelegateActionPayload,
    };
})(window);
