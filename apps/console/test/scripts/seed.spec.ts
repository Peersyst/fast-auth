import { MANAGEMENT_AUTH0, SES_EMAIL, TEST_CONFIG } from "../utils/test-config";
import type { ConsoleConfig } from "../../src/config/console-config";
import { Auth0ProvisionerName, ConfigEnv, EmailProviderName } from "../../src/config/console-config";
import { isContactEmail, isLogoUrl, isValidDescription, isValidName, isValidUrlList } from "@shared/console-domain/field-rules";
import { assertSeedAllowed, SeedState, seedFields, seedOwner } from "../../src/scripts/seed";

/**
 * Builds a test config with the given environment, adapters and Slack webhook.
 * @param env The environment.
 * @param provisioner The Auth0 provisioner.
 * @param emailProvider The email provider.
 * @param webhookUrl The Slack webhook URL, or null for none.
 * @returns The config.
 */
const makeConfig = (
    env: ConfigEnv,
    provisioner: Auth0ProvisionerName,
    emailProvider: EmailProviderName,
    webhookUrl: string | null = null,
): ConsoleConfig => ({
    ...TEST_CONFIG,
    server: { ...TEST_CONFIG.server, env },
    auth0: provisioner === Auth0ProvisionerName.MANAGEMENT ? MANAGEMENT_AUTH0 : TEST_CONFIG.auth0,
    email: emailProvider === EmailProviderName.SES ? SES_EMAIL : TEST_CONFIG.email,
    slack: { ...TEST_CONFIG.slack, webhookUrl },
});

describe("assertSeedAllowed", () => {
    it.each([ConfigEnv.DEVELOPMENT, ConfigEnv.TEST])("should allow %s on the fakes", (env) => {
        expect(() => assertSeedAllowed(makeConfig(env, Auth0ProvisionerName.FAKE, EmailProviderName.FAKE))).not.toThrow();
    });

    it.each([
        [ConfigEnv.STAGING, Auth0ProvisionerName.FAKE, EmailProviderName.FAKE],
        [ConfigEnv.PRODUCTION, Auth0ProvisionerName.MANAGEMENT, EmailProviderName.SES],
        [ConfigEnv.DEVELOPMENT, Auth0ProvisionerName.MANAGEMENT, EmailProviderName.FAKE],
        [ConfigEnv.TEST, Auth0ProvisionerName.FAKE, EmailProviderName.SES],
    ] as const)("should refuse CONFIG_ENV=%s with AUTH0_PROVISIONER=%s and EMAIL_PROVIDER=%s", (env, provisioner, email) => {
        expect(() => assertSeedAllowed(makeConfig(env, provisioner, email))).toThrow("seed runs only with CONFIG_ENV development or test");
    });

    it("should refuse a set SLACK_WEBHOOK_URL, naming the key but not its value", () => {
        const webhookUrl = "https://hooks.slack.com/services/T000/B000/token";

        expect(() =>
            assertSeedAllowed(makeConfig(ConfigEnv.DEVELOPMENT, Auth0ProvisionerName.FAKE, EmailProviderName.FAKE, webhookUrl)),
        ).toThrow(/; got CONFIG_ENV=development, AUTH0_PROVISIONER=fake, EMAIL_PROVIDER=fake, SLACK_WEBHOOK_URL set$/);
    });
});

describe("seed values", () => {
    it.each(Object.values(SeedState))("should make the %s dApp pass every field rule", (state) => {
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
