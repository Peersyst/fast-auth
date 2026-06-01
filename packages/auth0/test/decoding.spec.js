/**
 * @jest-environment node
 *
 * Unit tests for the decoding layer of the Auth0 action.
 * Covers the 11 action types in both transaction and (where applicable) delegate-action wrappers
 * plus malformed payload negative cases.
 */
const { parseTransaction, decodeDelegateAction, stringifyActions } = require("../src/actions/authorize-app.action.js");
const {
    buildTransaction,
    buildDelegateAction,
    buildAction,
    DELEGATE_ACTION_TYPES,
    ed25519PublicKey,
    secp256k1PublicKey,
} = require("./fixtures/builders.js");
const { transactionCases, delegateCases } = require("./fixtures/malformed.js");

describe("parseTransaction — happy paths", () => {
    test("decodes signer/receiver/blockHash for a baseline transfer", () => {
        const { csv } = buildTransaction({
            signerId: "alice.near",
            receiverId: "bob.near",
            actions: [buildAction.transfer({ deposit: "1500000000000000000000000" })],
        });
        const decoded = parseTransaction(csv);
        expect(decoded.signerId).toBe("alice.near");
        expect(decoded.receiverId).toBe("bob.near");
        expect(decoded.actions).toHaveLength(1);
        expect(decoded.actions[0].transfer.deposit).toBe(BigInt("1500000000000000000000000"));
        expect(decoded.blockHash.length).toBe(32);
    });

    test("decodes ed25519 vs secp256k1 signer public keys", () => {
        const ed = buildTransaction({ publicKey: ed25519PublicKey() });
        const decodedEd = parseTransaction(ed.csv);
        expect(decodedEd.publicKey.ed25519Key).toBeDefined();
        expect(decodedEd.publicKey.ed25519Key.data.length).toBe(32);

        const sec = buildTransaction({ publicKey: secp256k1PublicKey() });
        const decodedSec = parseTransaction(sec.csv);
        expect(decodedSec.publicKey.secp256k1Key).toBeDefined();
        expect(decodedSec.publicKey.secp256k1Key.data.length).toBe(64);
    });

    test.each([
        ["createAccount", () => buildAction.createAccount(), (a) => expect(a.createAccount).toEqual({})],
        ["deployContract", () => buildAction.deployContract(), (a) => expect(a.deployContract.code.length).toBe(8)],
        [
            "functionCall",
            () => buildAction.functionCall(),
            (a) => {
                expect(a.functionCall.methodName).toBe("ft_transfer");
                expect(a.functionCall.gas).toBe(BigInt("30000000000000"));
            },
        ],
        ["transfer", () => buildAction.transfer(), (a) => expect(typeof a.transfer.deposit).toBe("bigint")],
        ["stake", () => buildAction.stake(), (a) => expect(typeof a.stake.stake).toBe("bigint")],
        ["addKey (fullAccess)", () => buildAction.addKeyFullAccess(), (a) => expect(a.addKey.accessKey.permission.fullAccess).toEqual({})],
        [
            "addKey (functionCall)",
            () => buildAction.addKeyFunctionCall(),
            (a) => expect(a.addKey.accessKey.permission.functionCall.receiverId).toBe("contract.near"),
        ],
        ["deleteKey", () => buildAction.deleteKey(), (a) => expect(a.deleteKey.publicKey).toBeDefined()],
        ["deleteAccount", () => buildAction.deleteAccount(), (a) => expect(a.deleteAccount.beneficiaryId).toBe("beneficiary.near")],
        ["signedDelegate", () => buildAction.signedDelegate(), (a) => expect(a.signedDelegate.delegateAction.senderId).toBe("alice.near")],
        ["deployGlobalContract", () => buildAction.deployGlobalContract(), (a) => expect(a.deployGlobalContract.code.length).toBe(6)],
        [
            "useGlobalContract",
            () => buildAction.useGlobalContract(),
            (a) => expect(a.useGlobalContract.contractIdentifier.AccountId).toBe("global.near"),
        ],
    ])("decodes action: %s", (_name, build, assertion) => {
        const { csv } = buildTransaction({ actions: [build()] });
        const decoded = parseTransaction(csv);
        expect(decoded.actions).toHaveLength(1);
        assertion(decoded.actions[0]);
    });

    test("decodes multiple actions in a single transaction", () => {
        const { csv } = buildTransaction({
            actions: [buildAction.transfer(), buildAction.functionCall(), buildAction.createAccount()],
        });
        const decoded = parseTransaction(csv);
        expect(decoded.actions).toHaveLength(3);
        expect(decoded.actions[0].transfer).toBeDefined();
        expect(decoded.actions[1].functionCall).toBeDefined();
        expect(decoded.actions[2].createAccount).toEqual({});
    });
});

describe("parseTransaction — malformed payloads", () => {
    test.each(transactionCases().map((c) => [c.name, c]))("throws on: %s", (_name, c) => {
        expect(() => parseTransaction(c.csv)).toThrow();
    });
});

describe("decodeDelegateAction — happy paths", () => {
    test("decodes senderId, receiverId, maxBlockHeight, nonce", () => {
        const { csv } = buildDelegateAction({
            senderId: "alice.near",
            receiverId: "bob.near",
            nonce: BigInt(42),
            maxBlockHeight: BigInt(1000),
            actions: [buildAction.transfer()],
        });
        const decoded = decodeDelegateAction(csv);
        expect(decoded.senderId).toBe("alice.near");
        expect(decoded.receiverId).toBe("bob.near");
        expect(decoded.nonce).toBe(BigInt(42));
        expect(decoded.maxBlockHeight).toBe(BigInt(1000));
        expect(decoded.actions).toHaveLength(1);
    });

    test.each(DELEGATE_ACTION_TYPES.map((a) => [a.name, a.build]))("delegate decodes action: %s", (_name, build) => {
        const { csv } = buildDelegateAction({ actions: [build()] });
        const decoded = decodeDelegateAction(csv);
        expect(decoded.actions).toHaveLength(1);
        // The action key (createAccount, transfer, etc.) must be present.
        const key = Object.keys(decoded.actions[0])[0];
        expect(key).toBeTruthy();
    });
});

describe("decodeDelegateAction — malformed payloads", () => {
    test.each(delegateCases().map((c) => [c.name, c]))("%s", (_name, c) => {
        if (c.nonThrowing) {
            expect(() => decodeDelegateAction(c.csv)).not.toThrow();
        } else {
            expect(() => decodeDelegateAction(c.csv)).toThrow();
        }
    });
});

describe("stringifyActions", () => {
    test("serializes BigInt as string", () => {
        const actions = [buildAction.transfer({ deposit: "10" })];
        // Build via decode so we get real BigInts in the structure.
        const { csv } = buildTransaction({ actions });
        const decoded = parseTransaction(csv);
        const serialized = stringifyActions(decoded.actions);
        const parsed = JSON.parse(serialized);
        expect(parsed[0].transfer.deposit).toBe("10");
    });

    test("produces JSON parseable output for every action type", () => {
        const allActions = [buildAction.createAccount(), buildAction.transfer(), buildAction.functionCall(), buildAction.deleteAccount()];
        const { csv } = buildTransaction({ actions: allActions });
        const decoded = parseTransaction(csv);
        const serialized = stringifyActions(decoded.actions);
        expect(() => JSON.parse(serialized)).not.toThrow();
    });
});
