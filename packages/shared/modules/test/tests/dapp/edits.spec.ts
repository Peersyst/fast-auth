import { classifyEdit, DAPP_FIELDS, DappFields, diffFields, diffSyncedFields, MauBracket, SYNCED_FIELDS } from "../../../src/dapp";

const LIVE: DappFields = {
    name: "Acme",
    description: "A wallet",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/silent"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz"],
    contactEmail: "dev@acme.xyz",
    mauBracket: MauBracket.LT_1K,
};

const PENDING: DappFields = {
    name: "Acme Wallet",
    description: "A wallet",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://acme.xyz/callback", "https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz", "https://app.acme.xyz"],
    contactEmail: "dev@acme.xyz",
    mauBracket: MauBracket.GT_25K,
};

describe("dapp edits", () => {
    describe("diffFields", () => {
        it("should list changed fields with their values in field order", () => {
            const after: DappFields = { ...LIVE, mauBracket: MauBracket.GT_25K, name: "Acme Wallet", logoutUrls: ["https://acme.xyz/"] };

            expect(diffFields(DAPP_FIELDS, LIVE, after)).toEqual([
                { field: "name", before: "Acme", after: "Acme Wallet" },
                { field: "logoutUrls", before: [], after: ["https://acme.xyz/"] },
                { field: "mauBracket", before: "lt1k", after: "gt25k" },
            ]);
        });

        it("should record a contact email change by field name only", () => {
            expect(diffFields(DAPP_FIELDS, LIVE, { ...LIVE, contactEmail: "ops@acme.xyz" })).toEqual([{ field: "contactEmail" }]);
        });

        it("should compare lists as sets, ignoring order and duplicates", () => {
            const reordered = ["https://acme.xyz/silent", "https://acme.xyz/callback", "https://acme.xyz/silent"];

            expect(diffFields(DAPP_FIELDS, LIVE, { ...LIVE, callbackUrls: reordered })).toEqual([]);
        });

        it("should see a list change when the sizes match but a member differs", () => {
            const callbackUrls = ["https://acme.xyz/callback", "https://acme.xyz/other"];

            expect(diffFields(DAPP_FIELDS, LIVE, { ...LIVE, callbackUrls })).toEqual([
                { field: "callbackUrls", before: LIVE.callbackUrls, after: callbackUrls },
            ]);
        });

        it("should compare only the fields it is given", () => {
            const after: DappFields = { ...LIVE, name: "Acme Wallet", mauBracket: MauBracket.GT_25K };

            expect(diffFields(SYNCED_FIELDS, LIVE, after)).toEqual([{ field: "name", before: "Acme", after: "Acme Wallet" }]);
        });
    });

    describe("diffSyncedFields", () => {
        it("should list only the synced fields that differ", () => {
            expect(diffSyncedFields(LIVE, { ...PENDING, webOrigins: LIVE.webOrigins })).toEqual([
                { field: "name", before: "Acme", after: "Acme Wallet" },
                { field: "callbackUrls", before: LIVE.callbackUrls, after: PENDING.callbackUrls },
            ]);
        });
    });

    describe("classifyEdit", () => {
        it("should change nothing when nothing changed", () => {
            expect(classifyEdit(LIVE, null, { ...LIVE })).toEqual({ kind: "unchanged" });
        });

        it("should request a change for a contact email or MAU change, recording the email by name only", () => {
            expect(classifyEdit(LIVE, null, { ...LIVE, mauBracket: MauBracket.FROM_1K_TO_10K, contactEmail: "ops@acme.xyz" })).toEqual({
                kind: "replaced",
                change: { ...LIVE, mauBracket: "1k_10k", contactEmail: "ops@acme.xyz" },
                changes: [{ field: "contactEmail" }, { field: "mauBracket", before: "lt1k", after: "1k_10k" }],
            });
        });

        it("should request a change holding every proposed field, each change from its live value", () => {
            expect(classifyEdit(LIVE, null, PENDING)).toEqual({
                kind: "replaced",
                change: PENDING,
                changes: [
                    { field: "name", before: "Acme", after: "Acme Wallet" },
                    { field: "callbackUrls", before: LIVE.callbackUrls, after: PENDING.callbackUrls },
                    { field: "webOrigins", before: LIVE.webOrigins, after: PENDING.webOrigins },
                    { field: "mauBracket", before: "lt1k", after: "gt25k" },
                ],
            });
        });

        it("should keep the pending change when the proposal equals it as sets", () => {
            expect(classifyEdit(LIVE, PENDING, { ...PENDING, webOrigins: [...PENDING.webOrigins].reverse() })).toEqual({
                kind: "unchanged",
            });
        });

        it("should withdraw the pending change when the proposal is back to live", () => {
            expect(classifyEdit(LIVE, PENDING, { ...LIVE })).toEqual({ kind: "withdrawn" });
        });

        it("should replace the pending change when only the contact email differs from it", () => {
            expect(classifyEdit(LIVE, PENDING, { ...PENDING, contactEmail: "ops@acme.xyz" })).toEqual({
                kind: "replaced",
                change: { ...PENDING, contactEmail: "ops@acme.xyz" },
                changes: [
                    { field: "name", before: "Acme", after: "Acme Wallet" },
                    { field: "callbackUrls", before: LIVE.callbackUrls, after: PENDING.callbackUrls },
                    { field: "webOrigins", before: LIVE.webOrigins, after: PENDING.webOrigins },
                    { field: "contactEmail" },
                    { field: "mauBracket", before: "lt1k", after: "gt25k" },
                ],
            });
        });
    });
});
