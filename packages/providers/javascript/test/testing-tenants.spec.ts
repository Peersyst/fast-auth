import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FAST_AUTH_TESTING_TENANTS, FastAuthTestingTenant } from "@shared/core";

const loginDir = join(__dirname, "../../../../apps/console-web/login");

describe("FAST_AUTH_TESTING_TENANTS", () => {
    describe.each(["testnet", "mainnet-testing"] as FastAuthTestingTenant[])("%s", (tenant) => {
        const config = JSON.parse(readFileSync(join(loginDir, tenant, "config.json"), "utf8"));
        const entry = FAST_AUTH_TESTING_TENANTS[tenant];

        it("should agree with the login page config.json", () => {
            expect(Object.keys(config).sort()).toEqual(["auth0Url", "callbackUrl", "clientId"]);
            expect(`https://${entry.domain}`).toBe(config.auth0Url);
        });

        it("should have a login page whose own callback page is the one in config.json", () => {
            expect(new URL("callback.html", entry.loginUrl).toString()).toBe(config.callbackUrl);
        });

        it("should have the login page URL of its own login page", () => {
            expect(new URL(entry.loginUrl).pathname).toBe(`/login/${tenant}/`);
            expect(existsSync(join(loginDir, tenant, "index.html"))).toBe(true);
        });
    });
});
