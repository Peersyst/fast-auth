import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const loginDir = resolve(__dirname, "../../../login");
const tenants = readdirSync(loginDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

describe("login tenants", () => {
    it("should be the two testing tenants", () => {
        expect(tenants).toEqual(["mainnet-testing", "testnet"]);
    });

    describe.each(tenants)("%s config.json", (tenant) => {
        const config = JSON.parse(readFileSync(join(loginDir, tenant, "config.json"), "utf8"));
        const auth0Url = new URL(config.auth0Url);

        it("should use an https custom domain, which custom-field Forms need", () => {
            expect(auth0Url.protocol).toBe("https:");
            expect(auth0Url.hostname).not.toBe("login.auth.near.org");
            expect(auth0Url.hostname.endsWith(".auth0.com")).toBe(false);
        });

        it("should have the staging callback URL of its own tenant", () => {
            expect(config.callbackUrl).toBe(`https://console-staging.aws.peersyst.tech/login/${tenant}/callback.html`);
        });
    });
});
