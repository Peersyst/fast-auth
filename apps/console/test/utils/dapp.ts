import type { Auth0ClientId, Dapp, DappId } from "@shared/console-domain/dapp";
import { DappStatus, MauBracket } from "@shared/console-domain/dapp";

export const CLIENT_ID = "abcDEF123" as Auth0ClientId;

/**
 * Builds an approved dApp with fixed values.
 * @param overrides The fields to replace.
 * @returns The dApp.
 */
export const makeDapp = (overrides: Partial<Dapp> = {}): Dapp => ({
    id: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b" as DappId,
    name: "Acme Wallet",
    description: "Acme wallet",
    logoUrl: "https://acme.example/logo.png",
    callbackUrls: ["https://acme.example/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.example"],
    contactEmail: "dev@acme.example",
    mauBracket: MauBracket.LT_1K,
    ownerEmail: "owner@acme.example",
    status: DappStatus.APPROVED,
    rejectionReason: null,
    pendingChange: null,
    pendingChangeAt: null,
    auth0ClientId: CLIENT_ID,
    auth0SyncedAt: null,
    auth0Error: null,
    submittedAt: new Date("2026-10-01T00:00:00Z"),
    reviewedAt: null,
    reviewedBy: null,
    removedAt: null,
    removedBy: null,
    removalReason: null,
    version: 1,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
});
