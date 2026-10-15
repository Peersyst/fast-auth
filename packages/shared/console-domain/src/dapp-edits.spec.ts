import type { DappFields, SyncedFields } from "./dapp";
import { DAPP_FIELDS, DIRECT_FIELDS, SYNCED_FIELDS } from "./dapp";
import { classifyEdit, diffFields } from "./dapp-edits";

const LIVE: DappFields = {
    name: "Acme",
    description: "A wallet",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/silent"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz"],
    contactEmail: "dev@acme.xyz",
    mauBracket: "lt1k",
};

const PENDING: SyncedFields = {
    name: "Acme Wallet",
    description: "A wallet",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://acme.xyz/callback", "https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz", "https://app.acme.xyz"],
};

describe("diffFields", () => {
    it("finds no change between equal values", () => {
        expect(diffFields(DAPP_FIELDS, LIVE, { ...LIVE })).toEqual([]);
    });

    it("records synced and MAU changes with their values, in field order", () => {
        const after: DappFields = { ...LIVE, mauBracket: "gt25k", name: "Acme Wallet", logoutUrls: ["https://acme.xyz/"] };
        expect(diffFields(DAPP_FIELDS, LIVE, after)).toEqual([
            { field: "name", before: "Acme", after: "Acme Wallet" },
            { field: "logoutUrls", before: [], after: ["https://acme.xyz/"] },
            { field: "mauBracket", before: "lt1k", after: "gt25k" },
        ]);
    });

    it("records a contact-email change by field name only", () => {
        const changes = diffFields(DAPP_FIELDS, LIVE, { ...LIVE, contactEmail: "ops@acme.xyz" });
        expect(changes).toEqual([{ field: "contactEmail" }]);
    });

    it("treats lists as sets, so order and duplicates are not changes", () => {
        const after: DappFields = {
            ...LIVE,
            callbackUrls: ["https://acme.xyz/silent", "https://acme.xyz/callback", "https://acme.xyz/silent"],
        };
        expect(diffFields(DAPP_FIELDS, LIVE, after)).toEqual([]);
    });

    it("sees a list change when sizes match but members differ", () => {
        const after: DappFields = { ...LIVE, callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/other"] };
        expect(diffFields(DAPP_FIELDS, LIVE, after)).toEqual([
            { field: "callbackUrls", before: LIVE.callbackUrls, after: ["https://acme.xyz/callback", "https://acme.xyz/other"] },
        ]);
    });

    it("sees a list change when a member is removed", () => {
        const after: DappFields = { ...LIVE, callbackUrls: ["https://acme.xyz/callback"] };
        expect(diffFields(DAPP_FIELDS, LIVE, after)).toEqual([
            { field: "callbackUrls", before: LIVE.callbackUrls, after: ["https://acme.xyz/callback"] },
        ]);
    });

    it("only compares the fields it is given", () => {
        const after: DappFields = { ...LIVE, name: "Acme Wallet", mauBracket: "gt25k" };
        expect(diffFields(SYNCED_FIELDS, LIVE, after)).toEqual([{ field: "name", before: "Acme", after: "Acme Wallet" }]);
        expect(diffFields(DIRECT_FIELDS, LIVE, after)).toEqual([{ field: "mauBracket", before: "lt1k", after: "gt25k" }]);
    });
});

describe("classifyEdit", () => {
    describe("without a pending change", () => {
        it("does nothing when nothing changed", () => {
            expect(classifyEdit(LIVE, null, { ...LIVE })).toEqual({ directChanges: [], pendingChange: { kind: "unchanged" } });
        });

        it("applies direct fields at once", () => {
            expect(classifyEdit(LIVE, null, { ...LIVE, mauBracket: "1k_10k", contactEmail: "ops@acme.xyz" })).toEqual({
                directChanges: [{ field: "contactEmail" }, { field: "mauBracket", before: "lt1k", after: "1k_10k" }],
                pendingChange: { kind: "unchanged" },
            });
        });

        it("requests a change for synced fields, recording each from its live value to the requested one", () => {
            const proposed: DappFields = { ...LIVE, ...PENDING, mauBracket: "gt25k" };
            expect(classifyEdit(LIVE, null, proposed)).toEqual({
                directChanges: [{ field: "mauBracket", before: "lt1k", after: "gt25k" }],
                pendingChange: {
                    kind: "replaced",
                    change: PENDING,
                    changes: [
                        { field: "name", before: "Acme", after: "Acme Wallet" },
                        { field: "callbackUrls", before: LIVE.callbackUrls, after: PENDING.callbackUrls },
                        { field: "webOrigins", before: LIVE.webOrigins, after: PENDING.webOrigins },
                    ],
                },
            });
        });

        it("puts only synced fields in the requested change", () => {
            expect(classifyEdit(LIVE, null, { ...LIVE, description: "A better wallet" }).pendingChange).toEqual({
                kind: "replaced",
                change: {
                    name: "Acme",
                    description: "A better wallet",
                    logoUrl: LIVE.logoUrl,
                    callbackUrls: LIVE.callbackUrls,
                    logoutUrls: LIVE.logoutUrls,
                    webOrigins: LIVE.webOrigins,
                },
                changes: [{ field: "description", before: "A wallet", after: "A better wallet" }],
            });
        });
    });

    describe("with a pending change", () => {
        it("keeps it when the synced fields equal it", () => {
            expect(classifyEdit(LIVE, PENDING, { ...LIVE, ...PENDING })).toEqual({
                directChanges: [],
                pendingChange: { kind: "unchanged" },
            });
        });

        it("keeps it when the lists equal it as sets, and still applies direct fields", () => {
            const proposed: DappFields = {
                ...LIVE,
                ...PENDING,
                webOrigins: [...PENDING.webOrigins].reverse(),
                contactEmail: "ops@acme.xyz",
            };
            expect(classifyEdit(LIVE, PENDING, proposed)).toEqual({
                directChanges: [{ field: "contactEmail" }],
                pendingChange: { kind: "unchanged" },
            });
        });

        it("withdraws it when the synced fields are back to live", () => {
            expect(classifyEdit(LIVE, PENDING, { ...LIVE })).toEqual({ directChanges: [], pendingChange: { kind: "withdrawn" } });
        });

        it("withdraws it and applies direct fields", () => {
            expect(classifyEdit(LIVE, PENDING, { ...LIVE, mauBracket: "10k_25k" })).toEqual({
                directChanges: [{ field: "mauBracket", before: "lt1k", after: "10k_25k" }],
                pendingChange: { kind: "withdrawn" },
            });
        });

        it("replaces it with anything else, recording each field from its live value to the requested one", () => {
            const proposed: DappFields = { ...LIVE, ...PENDING, name: "Acme Pay" };
            expect(classifyEdit(LIVE, PENDING, proposed)).toEqual({
                directChanges: [],
                pendingChange: {
                    kind: "replaced",
                    change: { ...PENDING, name: "Acme Pay" },
                    changes: [
                        { field: "name", before: "Acme", after: "Acme Pay" },
                        { field: "callbackUrls", before: LIVE.callbackUrls, after: PENDING.callbackUrls },
                        { field: "webOrigins", before: LIVE.webOrigins, after: PENDING.webOrigins },
                    ],
                },
            });
        });
    });
});
