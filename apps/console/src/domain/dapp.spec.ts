import type { DappFields } from "./dapp";
import { directFieldsOf } from "./dapp";

describe("directFieldsOf", () => {
    it("keeps only the fields an owner may change without review", () => {
        const fields: DappFields = {
            name: "Acme",
            description: "A wallet",
            logoUrl: "https://cdn.acme.xyz/logo.png",
            callbackUrls: ["https://acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://acme.xyz"],
            contactEmail: "dev@acme.xyz",
            mauBracket: "lt1k",
        };

        expect(directFieldsOf(fields)).toEqual({ contactEmail: "dev@acme.xyz", mauBracket: "lt1k" });
    });
});
