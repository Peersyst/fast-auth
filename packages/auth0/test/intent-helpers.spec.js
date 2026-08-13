/**
 * @jest-environment jsdom
 *
 * Tests for `renderIntentDetails` — the approval screen for NEP-413 intents.
 *
 * This is the half of the security model the contract cannot enforce: the user must be able
 * to read what they are about to sign. These tests assert the transfer details actually reach
 * the DOM, and that anything the form cannot describe is surfaced with a warning rather than
 * rendered as if it were understood.
 */
const helpers = require("../src/forms/shared/helpers/index.js");

const TRANSFER = { intent: "transfer", receiver_id: "deposit.near", tokens: { "nep141:usdc.near": "1000000" } };

function render(intents, fields = []) {
    return helpers.renderIntentDetails({ fields, intents: JSON.stringify(intents) });
}

describe("renderIntentDetails — top-level fields", () => {
    test("renders the fields it is given", () => {
        const box = render(
            [TRANSFER],
            [
                { label: "Signer ID", value: "trader.near" },
                { label: "Verifier", value: "intents.near" },
                { label: "Deadline", value: "2026-01-01T00:00:00.000Z" },
            ],
        );
        const text = box.textContent;
        expect(text).toContain("trader.near");
        expect(text).toContain("intents.near");
        expect(text).toContain("2026-01-01T00:00:00.000Z");
    });

    test("skips empty fields instead of rendering blank rows", () => {
        const box = render([TRANSFER], [{ label: "Deadline", value: "" }]);
        expect(box.textContent).not.toContain("Deadline");
    });

    test("labels the section as Intents", () => {
        const box = render([TRANSFER]);
        expect(box.querySelector(".actions-container").textContent).toContain("Intents");
    });
});

describe("renderIntentDetails — transfer intents", () => {
    test("shows the receiver and the token amount", () => {
        const box = render([TRANSFER]);
        const text = box.textContent;
        expect(text).toContain("deposit.near");
        expect(text).toContain("nep141:usdc.near");
        expect(text).toContain("1000000");
    });

    test("labels the accordion as Transfer without a warning", () => {
        const box = render([TRANSFER]);
        expect(box.querySelector(".accordion-header-label").textContent).toBe("Transfer");
        expect(box.querySelector(".warning-icon")).toBeNull();
    });

    test("renders every token in a multi-token transfer", () => {
        const box = render([{ ...TRANSFER, tokens: { "nep141:usdc.near": "1", "nep141:usdt.near": "2" } }]);
        const text = box.textContent;
        expect(text).toContain("nep141:usdc.near");
        expect(text).toContain("nep141:usdt.near");
    });

    test("renders one accordion per intent", () => {
        const box = render([TRANSFER, { ...TRANSFER, receiver_id: "other.near" }]);
        expect(box.querySelectorAll(".accordion")).toHaveLength(2);
        expect(box.textContent).toContain("other.near");
    });

    test("survives a transfer with no tokens map", () => {
        const box = render([{ intent: "transfer", receiver_id: "deposit.near" }]);
        expect(box.textContent).toContain("deposit.near");
    });
});

describe("renderIntentDetails — unrecognized intents", () => {
    test("flags an unknown intent kind with a warning", () => {
        const box = render([{ intent: "token_diff", diff: { "nep141:usdc.near": "-1" } }]);
        expect(box.querySelector(".warning-icon")).not.toBeNull();
        expect(box.querySelector(".accordion-header-label").textContent).toBe("Unknown: token_diff");
    });

    test("still shows the raw payload of an unknown intent", () => {
        const box = render([{ intent: "token_diff", diff: { "nep141:usdc.near": "-1" } }]);
        expect(box.textContent).toContain("token_diff");
        expect(box.textContent).toContain("nep141:usdc.near");
    });

    test("flags an intent with no kind at all", () => {
        const box = render([{ receiver_id: "deposit.near" }]);
        expect(box.querySelector(".accordion-header-label").textContent).toBe("Unknown");
        expect(box.querySelector(".warning-icon")).not.toBeNull();
    });

    test("warns per intent, leaving known ones unflagged", () => {
        const box = render([TRANSFER, { intent: "mystery" }]);
        const labels = Array.from(box.querySelectorAll(".accordion-header-label")).map((n) => n.textContent);
        expect(labels).toEqual(["Transfer", "Unknown: mystery"]);
        expect(box.querySelectorAll(".warning-icon")).toHaveLength(1);
    });
});

describe("renderIntentDetails — malformed payloads", () => {
    test("shows a parse error instead of throwing", () => {
        const box = helpers.renderIntentDetails({ fields: [], intents: "{not json" });
        expect(box.querySelector(".warning-callout").textContent).toBe("Failed to parse intents payload.");
    });

    test("renders an empty section when there are no intents", () => {
        const box = render([]);
        expect(box.querySelectorAll(".accordion")).toHaveLength(0);
    });

    test("treats a missing intents string as empty", () => {
        const box = helpers.renderIntentDetails({ fields: [] });
        expect(box.querySelectorAll(".accordion")).toHaveLength(0);
    });
});
