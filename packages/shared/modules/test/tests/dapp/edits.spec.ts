import { changedFields, DappFields, hasSyncedChange, MauBracket } from "../../../src/dapp";

describe("dapp edits", () => {
    const live: DappFields = {
        name: "Acme",
        description: "A wallet",
        logoUrl: "https://cdn.acme.xyz/logo.png",
        callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/silent"],
        logoutUrls: [],
        webOrigins: ["https://acme.xyz"],
        contactEmail: "dev@acme.xyz",
        mauBracket: MauBracket.LT_1K,
    };

    describe("changedFields", () => {
        it("should keep only the requested fields that differ from the live ones", () => {
            const requested: Partial<DappFields> = {
                name: "Acme Wallet",
                description: "A wallet",
                logoutUrls: ["https://acme.xyz/"],
                mauBracket: MauBracket.GT_25K,
            };

            expect(changedFields(live, requested)).toEqual({
                name: "Acme Wallet",
                logoutUrls: ["https://acme.xyz/"],
                mauBracket: "gt25k",
            });
        });

        it("should find nothing changed when every requested field equals its live value", () => {
            expect(changedFields(live, { ...live })).toEqual({});
            expect(changedFields(live, {})).toEqual({});
        });

        it("should compare lists as sets, ignoring order and duplicates", () => {
            const reordered = ["https://acme.xyz/silent", "https://acme.xyz/callback", "https://acme.xyz/silent"];

            expect(changedFields(live, { callbackUrls: reordered })).toEqual({});
        });

        it("should see a list change when the sizes match but a member differs", () => {
            const callbackUrls = ["https://acme.xyz/callback", "https://acme.xyz/other"];

            expect(changedFields(live, { callbackUrls })).toEqual({ callbackUrls });
        });
    });

    describe("hasSyncedChange", () => {
        it.each<[string, Partial<DappFields>, boolean]>([
            ["a name change", { name: "Acme Wallet" }, true],
            ["a web origin change", { webOrigins: ["https://app.acme.xyz"] }, true],
            ["a contact email and MAU change", { contactEmail: "ops@acme.xyz", mauBracket: MauBracket.GT_25K }, false],
            ["no change", {}, false],
        ])("should answer for %s", (_case, change, synced) => {
            expect(hasSyncedChange(change)).toBe(synced);
        });
    });
});
