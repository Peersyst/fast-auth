import { mockify } from "@shared/test";
import { DappChangeDto } from "../../../src/models/DappChangeDto";

export const DappChangeMock = mockify<DappChangeDto>({
    id: "5c1f3a2e-7d4b-4e8a-9f6c-2b1a0d9e8c77",
    name: null,
    description: null,
    logoUrl: null,
    callbackUrls: null,
    logoutUrls: null,
    webOrigins: null,
    contactEmail: null,
    mauBracket: null,
    createdAt: "2026-10-03T10:00:00.000Z",
});
