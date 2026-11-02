import type { Auth0ClientId, Dapp, DappFields, DappId } from "../../src/dapp";
import { clientIdOf, DappStatus, directFieldsOf, MauBracket } from "../../src/dapp";

describe("directFieldsOf", () => {
    it("should keep only the fields an owner may change without review", () => {
        const fields: DappFields = {
            name: "Acme",
            description: "A wallet",
            logoUrl: "https://cdn.acme.xyz/logo.png",
            callbackUrls: ["https://acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://acme.xyz"],
            contactEmail: "dev@acme.xyz",
            mauBracket: MauBracket.LT_1K,
        };

        expect(directFieldsOf(fields)).toEqual({ contactEmail: "dev@acme.xyz", mauBracket: "lt1k" });
    });
});

describe("clientIdOf", () => {
    const dapp: Dapp = {
        name: "Acme",
        description: "A wallet",
        logoUrl: "https://cdn.acme.xyz/logo.png",
        callbackUrls: ["https://acme.xyz/callback"],
        logoutUrls: [],
        webOrigins: ["https://acme.xyz"],
        contactEmail: "dev@acme.xyz",
        mauBracket: MauBracket.LT_1K,
        id: "dapp-1" as DappId,
        ownerEmail: "owner@acme.xyz",
        status: DappStatus.APPROVED,
        rejectionReason: null,
        pendingChange: null,
        pendingChangeAt: null,
        auth0ClientId: "client-1" as Auth0ClientId,
        auth0SyncedAt: null,
        auth0Error: null,
        submittedAt: new Date("2026-01-01T00:00:00Z"),
        reviewedAt: null,
        reviewedBy: null,
        removedAt: null,
        removedBy: null,
        removalReason: null,
        version: 1,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
    };

    it("should return the Auth0 client id of an approved dApp", () => {
        expect(clientIdOf(dapp)).toBe("client-1");
    });

    it("should throw when the dApp has no Auth0 client", () => {
        expect(() => clientIdOf({ ...dapp, auth0ClientId: null })).toThrow("Approved dApp dapp-1 has no Auth0 client");
    });
});
