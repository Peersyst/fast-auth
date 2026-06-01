/**
 * Negative fixtures for the decoding layer. Each entry has a `name` and a `csv` string
 * (or a thunk producing one) that should make `parseTransaction` / `decodeDelegateAction` throw.
 */
const { buildTransaction, buildDelegateAction, buildAction } = require("./builders.js");

// Layout for a baseline transaction with a known shape: the first action's enum
// discriminator sits at byte 103 (4 + 10 signerId + 33 ed25519 pubkey + 8 nonce +
// 4 + 8 receiverId + 32 blockHash + 4 actions_count). Used to corrupt the discriminator deterministically.
const BASELINE_TX = buildTransaction({
    signerId: "alice.near",
    receiverId: "bob.near",
    actions: [buildAction.transfer()],
});
const DISCRIMINATOR_OFFSET = 103;

function transactionCases() {
    const validBytes = Array.from(BASELINE_TX.bytes);
    const badDiscriminator = validBytes.slice();
    badDiscriminator[DISCRIMINATOR_OFFSET] = 99;

    return [
        { name: "empty string", csv: "" },
        { name: "single non-numeric token", csv: "abc" },
        { name: "mixed non-numeric tokens", csv: "1,2,three,4" },
        { name: "truncated to 4 bytes", csv: validBytes.slice(0, 4).join(",") },
        { name: "truncated mid-action", csv: validBytes.slice(0, Math.floor(validBytes.length / 2)).join(",") },
        { name: "invalid action discriminator", csv: badDiscriminator.join(",") },
    ];
}

// Baseline for a delegate action with a known shape so we can corrupt the action
// discriminator at a fixed offset. Layout:
// 4 prefix + 4 + 10 senderId + 4 + 8 receiverId + 4 actions_count = 34 → first action disc at offset 34.
const BASELINE_DA = buildDelegateAction({
    senderId: "alice.near",
    receiverId: "bob.near",
    actions: [buildAction.transfer()],
});
const DA_DISCRIMINATOR_OFFSET = 34;

function delegateCases() {
    const validBytes = Array.from(BASELINE_DA.bytes);
    const badDiscriminator = validBytes.slice();
    badDiscriminator[DA_DISCRIMINATOR_OFFSET] = 200;
    const wrongPrefix = validBytes.slice();
    wrongPrefix[0] = 0;
    wrongPrefix[1] = 0;
    wrongPrefix[2] = 0;
    wrongPrefix[3] = 0;

    return [
        { name: "empty string", csv: "" },
        { name: "only the prefix", csv: validBytes.slice(0, 4).join(",") },
        { name: "truncated body", csv: validBytes.slice(0, 10).join(",") },
        { name: "non-numeric tokens", csv: "x,y,z,w,1,2,3" },
        { name: "invalid action discriminator", csv: badDiscriminator.join(",") },
        // Documented non-throw: a zero-prefix delegate still deserializes because the prefix is
        // read into an unvalidated struct. Tests assert this behavior to flag any future tightening.
        { name: "zeroed prefix (does not throw)", csv: wrongPrefix.join(","), nonThrowing: true },
    ];
}

module.exports = {
    transactionCases,
    delegateCases,
};
