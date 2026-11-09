import { mockify } from "@shared/test";
import { OwnerDappDto } from "../../../src/models/OwnerDappDto";

export const DAPP_ID_MOCK = "0d9f3b8e-1c5e-4a40-9c0e-6a6f7f0b5a11";

export const OwnerDappMock = mockify<OwnerDappDto>({
    id: DAPP_ID_MOCK,
    name: "Acme Wallet",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    mauBracket: "1k_10k",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
    contactEmail: "dev@acme.xyz",
    status: "pending",
    pendingChange: null,
    pendingChangeAt: null,
    auth0ClientId: null,
    version: 3,
    submittedAt: "2026-10-01T10:00:00.000Z",
});
