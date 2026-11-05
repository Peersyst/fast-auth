import { buildConfig, getConfigEnv, validHostName, validOneOf, validPositiveInt, validRequired } from "@backend/config";

export enum Auth0ProvisionerName {
    MANAGEMENT = "management",
    FAKE = "fake",
}

export enum NearNetwork {
    TESTNET = "testnet",
    MAINNET = "mainnet",
}

export interface Auth0ManagementConfig {
    domain: string;
    m2mClientId: string;
    m2mClientSecret: string;
    templateClientId: string;
    /** The wait before retrying a rate-limited or failed Management API call that sends no Retry-After. */
    retryAfterMs: number;
    /** The cap on a Retry-After. */
    maxRetryAfterMs: number;
    timeoutMs: number;
}

export interface Auth0Config {
    /** The tenant domain the console's users sign in on. */
    loginDomain: string;
    consoleClientId: string;
    nearNetwork: NearNetwork;
    jwksTimeoutMs: number;
    /** After a failed JWKS refetch, sessions verify with the last key set fetched for this long before the next refetch. */
    jwksRefetchCooldownMs: number;
    healthCheckIntervalMs: number;
    provisioner: Auth0ProvisionerName;
    /** The Management API settings, null when the provisioner is fake. */
    management: Auth0ManagementConfig | null;
}

/**
 * Builds the Management API configuration.
 * @returns The Management API configuration.
 */
const managementConfig = (): Auth0ManagementConfig => {
    return buildConfig<Auth0ManagementConfig>(
        {
            domain: process.env.AUTH0_MGMT_DOMAIN!,
            m2mClientId: process.env.AUTH0_M2M_CLIENT_ID!,
            m2mClientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!,
            templateClientId: process.env.AUTH0_TEMPLATE_CLIENT_ID!,
            retryAfterMs: process.env.AUTH0_MGMT_RETRY_AFTER_MS ? parseInt(process.env.AUTH0_MGMT_RETRY_AFTER_MS) : 1000,
            maxRetryAfterMs: process.env.AUTH0_MGMT_MAX_RETRY_AFTER_MS ? parseInt(process.env.AUTH0_MGMT_MAX_RETRY_AFTER_MS) : 10000,
            timeoutMs: process.env.AUTH0_MGMT_TIMEOUT_MS ? parseInt(process.env.AUTH0_MGMT_TIMEOUT_MS) : 10000,
        },
        {
            domain: validHostName,
            m2mClientId: validRequired,
            m2mClientSecret: validRequired,
            templateClientId: validRequired,
            retryAfterMs: validPositiveInt,
            maxRetryAfterMs: validPositiveInt,
            timeoutMs: validPositiveInt,
        },
    );
};

/**
 * Builds the Auth0 configuration. Production refuses the fake provisioner.
 * @returns The Auth0 configuration.
 */
export default (): Auth0Config => {
    const provisioner = process.env.AUTH0_PROVISIONER as Auth0ProvisionerName;

    return buildConfig<Auth0Config>(
        {
            loginDomain: process.env.AUTH0_LOGIN_DOMAIN!,
            consoleClientId: process.env.AUTH0_CONSOLE_CLIENT_ID!,
            nearNetwork: process.env.NEAR_NETWORK as NearNetwork,
            jwksTimeoutMs: process.env.AUTH0_JWKS_TIMEOUT_MS ? parseInt(process.env.AUTH0_JWKS_TIMEOUT_MS) : 6000,
            jwksRefetchCooldownMs: process.env.AUTH0_JWKS_REFETCH_COOLDOWN_MS
                ? parseInt(process.env.AUTH0_JWKS_REFETCH_COOLDOWN_MS)
                : 30000,
            healthCheckIntervalMs: process.env.AUTH0_HEALTH_CHECK_INTERVAL_MS
                ? parseInt(process.env.AUTH0_HEALTH_CHECK_INTERVAL_MS)
                : 600000,
            provisioner,
            management: provisioner === Auth0ProvisionerName.MANAGEMENT ? managementConfig() : null,
        },
        {
            loginDomain: validHostName,
            consoleClientId: validRequired,
            nearNetwork: validOneOf(Object.values(NearNetwork)),
            jwksTimeoutMs: validPositiveInt,
            jwksRefetchCooldownMs: validPositiveInt,
            healthCheckIntervalMs: validPositiveInt,
            provisioner: validOneOf(
                getConfigEnv() === "production" ? [Auth0ProvisionerName.MANAGEMENT] : Object.values(Auth0ProvisionerName),
            ),
        },
    );
};
