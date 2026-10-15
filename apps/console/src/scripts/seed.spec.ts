import { MANAGEMENT_AUTH0, SES_EMAIL, TEST_CONFIG } from "../../test/utils/test-config";
import type { Auth0ProvisionerName, ConfigEnv, ConsoleConfig, EmailProviderName } from "../config/console-config";
import { isContactEmail, isLogoUrl, isValidDescription, isValidName, isValidUrlList } from "../domain/field-rules";
import { assertSeedAllowed, SEED_STATES, seedFields, seedOwner } from "./seed";

const makeConfig = (
    env: ConfigEnv,
    provisioner: Auth0ProvisionerName,
    emailProvider: EmailProviderName,
    webhookUrl: string | null = null,
): ConsoleConfig => ({
    ...TEST_CONFIG,
    server: { ...TEST_CONFIG.server, env },
    auth0: provisioner === "management" ? MANAGEMENT_AUTH0 : TEST_CONFIG.auth0,
    email: emailProvider === "ses" ? SES_EMAIL : TEST_CONFIG.email,
    slack: { webhookUrl },
});

describe("assertSeedAllowed", () => {
    it.each(["development", "test"] as const)("allows %s on the fakes", (env) => {
        expect(() => assertSeedAllowed(makeConfig(env, "fake", "fake"))).not.toThrow();
    });

    it.each([
        ["staging", "fake", "fake"],
        ["production", "management", "ses"],
        ["development", "management", "fake"],
        ["test", "fake", "ses"],
    ] as const)("refuses CONFIG_ENV=%s with AUTH0_PROVISIONER=%s and EMAIL_PROVIDER=%s", (env, provisioner, email) => {
        expect(() => assertSeedAllowed(makeConfig(env, provisioner, email))).toThrow("seed runs only with CONFIG_ENV development or test");
    });

    it("refuses a set SLACK_WEBHOOK_URL, naming the key but not its value", () => {
        const webhookUrl = "https://hooks.slack.com/services/T000/B000/token";

        expect(() => assertSeedAllowed(makeConfig("development", "fake", "fake", webhookUrl))).toThrow(
            /; got CONFIG_ENV=development, AUTH0_PROVISIONER=fake, EMAIL_PROVIDER=fake, SLACK_WEBHOOK_URL set$/,
        );
    });
});

describe("seed values", () => {
    it.each(SEED_STATES)("the %s dApp passes every field rule", (state) => {
        const fields = seedFields(state);
        expect(isValidName(fields.name)).toBe(true);
        expect(isValidDescription(fields.description)).toBe(true);
        expect(isLogoUrl(fields.logoUrl)).toBe(true);
        expect(isValidUrlList("callbackUrls", fields.callbackUrls)).toBe(true);
        expect(isValidUrlList("logoutUrls", fields.logoutUrls)).toBe(true);
        expect(isValidUrlList("webOrigins", fields.webOrigins)).toBe(true);
        expect(isContactEmail(fields.contactEmail)).toBe(true);
        expect(isContactEmail(seedOwner(state).email)).toBe(true);
    });
});
