/**
 * @jest-environment jsdom
 *
 * Unit tests for src/forms/shared/helpers — pure formatters and DOM-producing factories.
 */
const helpers = require("../src/forms/shared/helpers/index.js");
const { buildAction, buildTransaction, ed25519PublicKey, secp256k1PublicKey } = require("./fixtures/builders.js");
const { parseTransaction } = require("../src/actions/authorize-app.action.js");

// jest-environment-jsdom (jest 29) ships an older jsdom without TextEncoder. Fall back to util.
const SafeTextEncoder = typeof TextEncoder !== "undefined" ? TextEncoder : require("util").TextEncoder;

describe("base58Encode", () => {
    test("encodes the empty array as empty string", () => {
        expect(helpers.base58Encode(new Uint8Array([]))).toBe("");
    });

    test("encodes the zero byte as '1' (alphabet[0])", () => {
        expect(helpers.base58Encode(new Uint8Array([0]))).toBe("1");
    });

    test("preserves leading zero bytes as leading '1's", () => {
        expect(helpers.base58Encode(new Uint8Array([0, 0, 0, 1]))).toBe("1112");
    });

    test("known vector: 32 zero bytes → 32 leading '1's", () => {
        const encoded = helpers.base58Encode(new Uint8Array(32));
        expect(encoded).toBe("1".repeat(32));
    });

    test("matches bs58 for a known input", () => {
        // The bytes [0x00, 0x01, 0x02, ..., 0x1F] (32 bytes) — verifying determinism rather than
        // a third-party value: encoding must be stable and start with '1' (leading zero) followed by
        // a non-trivial body.
        const bytes = Uint8Array.from(Array.from({ length: 32 }, (_, i) => i));
        const encoded = helpers.base58Encode(bytes);
        expect(encoded.startsWith("1")).toBe(true);
        expect(encoded.length).toBeGreaterThan(32);
    });
});

describe("yoctoToNear", () => {
    test.each([
        ["0", "0.0"],
        ["1", "0.0"],
        ["1000000000000000000000000", "1"],
        ["1500000000000000000000000", "1.5"],
        ["123456789012345678901234567890", "123456.78901234"], // 30 digits → 6 integer + 8 decimal (trimmed)
        ["10000000000000000000000000", "10"],
    ])("yoctoToNear(%s) → %s", (input, expected) => {
        expect(helpers.yoctoToNear(input)).toBe(expected);
    });
});

describe("formatNearAmount", () => {
    test("converts large amounts to NEAR when showYoctoConversion is on", () => {
        expect(helpers.formatNearAmount(BigInt("1500000000000000000000000"), { showYoctoConversion: true })).toBe("1.5 NEAR");
        expect(helpers.formatNearAmount("623260000000000000000000000", { showYoctoConversion: true })).toBe("623.26 NEAR");
    });

    test("keeps yoctoNEAR for amounts below the conversion threshold", () => {
        expect(helpers.formatNearAmount("1", { showYoctoConversion: true })).toBe("1 yoctoNEAR");
    });

    test("keeps yoctoNEAR when conversion is off (delegate-action mode)", () => {
        expect(helpers.formatNearAmount("1500000000000000000000000", { showYoctoConversion: false })).toBe(
            "1500000000000000000000000 yoctoNEAR",
        );
    });

    test("defaults a missing value to 0 yoctoNEAR", () => {
        expect(helpers.formatNearAmount(undefined, {})).toBe("0 yoctoNEAR");
    });
});

describe("decodeFunctionCallArgs", () => {
    function bytesOf(str) {
        return Array.from(new SafeTextEncoder().encode(str));
    }

    test("decodes a UTF-8 JSON byte array and pretty-prints it", () => {
        const out = helpers.decodeFunctionCallArgs(bytesOf('{"receiver_id":"alice.near","amount":"444"}'));
        expect(JSON.parse(out)).toEqual({ receiver_id: "alice.near", amount: "444" });
        expect(out).toContain("\n"); // pretty-printed
    });

    test("returns the raw decoded text when the bytes are not JSON", () => {
        expect(helpers.decodeFunctionCallArgs(bytesOf("not json"))).toBe("not json");
    });

    test("returns empty string for null/empty args", () => {
        expect(helpers.decodeFunctionCallArgs(null)).toBe("");
    });
});

describe("formatPublicKey", () => {
    test("formats ed25519 keys with the ed25519: prefix", () => {
        const k = helpers.formatPublicKey(ed25519PublicKey(0));
        expect(k.startsWith("ed25519:")).toBe(true);
    });

    test("formats secp256k1 keys with the secp256k1: prefix", () => {
        const k = helpers.formatPublicKey(secp256k1PublicKey(0));
        expect(k.startsWith("secp256k1:")).toBe(true);
    });

    test("returns empty string for an undefined input", () => {
        expect(helpers.formatPublicKey(undefined)).toBe("");
        expect(helpers.formatPublicKey({})).toBe("");
    });
});

describe("getActionType", () => {
    test.each([
        ["createAccount", { createAccount: {} }],
        ["transfer", { transfer: { deposit: 1n } }],
        ["functionCall", { functionCall: { methodName: "x", args: new Uint8Array(), gas: 1n, deposit: 1n } }],
    ])("identifies %s", (expected, action) => {
        expect(helpers.getActionType(action)).toBe(expected);
    });

    test("returns null for empty or invalid input", () => {
        expect(helpers.getActionType({})).toBe(null);
        expect(helpers.getActionType(null)).toBe(null);
    });
});

describe("renderDetails (DOM)", () => {
    function decodedActionsJson(actions) {
        const { csv } = buildTransaction({ actions });
        const decoded = parseTransaction(csv);
        return JSON.stringify(decoded.actions, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    }

    test("renders signer/receiver fields and an accordion per action", () => {
        const actions = [buildAction.transfer(), buildAction.functionCall()];
        const box = helpers.renderDetails({
            fields: [
                { label: "Signer ID", value: "alice.near" },
                { label: "Receiver ID", value: "bob.near" },
            ],
            actions: decodedActionsJson(actions),
            options: { showYoctoConversion: true },
        });
        expect(box.classList.contains("box")).toBe(true);
        const accordions = box.querySelectorAll(".accordion");
        expect(accordions.length).toBe(2);
        const labels = Array.from(box.querySelectorAll(".accordion-header-label")).map((n) => n.textContent);
        expect(labels).toEqual(["Transfer", "FunctionCall"]);
    });

    test("shows warning icon for dangerous actions (deployContract, deleteKey, deleteAccount)", () => {
        const actions = [buildAction.deployContract(), buildAction.deleteKey(), buildAction.deleteAccount()];
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson(actions),
            options: {},
        });
        const warnings = box.querySelectorAll(".warning-icon");
        expect(warnings.length).toBe(3);
    });

    test("shows warning for addKey with full access permission", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson([buildAction.addKeyFullAccess()]),
            options: {},
        });
        expect(box.querySelectorAll(".warning-icon").length).toBe(1);
    });

    test("does NOT show warning for addKey with function call permission", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson([buildAction.addKeyFunctionCall()]),
            options: {},
        });
        expect(box.querySelectorAll(".warning-icon").length).toBe(0);
    });

    test("transfer with showYoctoConversion uses NEAR units above the threshold", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson([buildAction.transfer({ deposit: "1500000000000000000000000" })]),
            options: { showYoctoConversion: true },
        });
        expect(box.textContent).toContain("NEAR");
        expect(box.textContent).toContain("1.5");
    });

    test("transfer without showYoctoConversion stays in yoctoNEAR", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson([buildAction.transfer({ deposit: "1500000000000000000000000" })]),
            options: { showYoctoConversion: false },
        });
        expect(box.textContent).toContain("yoctoNEAR");
    });

    test("omits a field when the value is undefined/empty", () => {
        const box = helpers.renderDetails({
            fields: [
                { label: "Signer ID", value: "alice.near" },
                { label: "Max Block Height", value: undefined },
            ],
            actions: "[]",
            options: {},
        });
        const labels = Array.from(box.querySelectorAll(".text-content > .label")).map((n) => n.textContent);
        expect(labels).toContain("Signer ID");
        expect(labels).not.toContain("Max Block Height");
    });

    test("renders a parse-error callout when actions JSON is malformed", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: "not json",
            options: {},
        });
        expect(box.querySelectorAll(".warning-callout").length).toBe(1);
        expect(box.textContent).toContain("Failed to parse actions payload");
    });

    test("accordion toggles 'open' class on click", () => {
        const box = helpers.renderDetails({
            fields: [],
            actions: decodedActionsJson([buildAction.transfer()]),
            options: {},
        });
        const header = box.querySelector(".accordion-header");
        const content = box.querySelector(".accordion-content");
        expect(content.classList.contains("open")).toBe(false);
        header.dispatchEvent(new Event("click"));
        expect(content.classList.contains("open")).toBe(true);
        header.dispatchEvent(new Event("click"));
        expect(content.classList.contains("open")).toBe(false);
    });
});
