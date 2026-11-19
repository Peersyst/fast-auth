import { buildConfig, validHostName, validPositiveInt, validRequired } from "@backend/config";

// Every client of a tenant can mint signing tokens for that tenant's accounts, so the open sandbox must never sign
// anyone in on a production tenant.
export const PRODUCTION_TENANTS = ["login.auth.near.org"];

export interface Auth0Config {
    /** The sandbox tenant's domain, the issuer of the tokens the broker hands out. */
    domain: string;
    /** The broker's client. dApps send this id too, since it is the audience of their ID tokens. */
    clientId: string;
    clientSecret: string;
    timeoutMs: number;
}

/**
 * Validates a tenant domain that is not a production one.
 * @param value The domain.
 * @returns True if the domain is a host name outside PRODUCTION_TENANTS.
 */
const validSandboxTenant = (value: string | undefined): boolean => validHostName(value) && !PRODUCTION_TENANTS.includes(value!);

/**
 * Builds the Auth0 configuration.
 * @returns The Auth0 configuration.
 */
export default (): Auth0Config => {
    return buildConfig<Auth0Config>(
        {
            domain: process.env.AUTH0_DOMAIN!,
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            timeoutMs: process.env.AUTH0_TIMEOUT_MS ? parseInt(process.env.AUTH0_TIMEOUT_MS) : 10000,
        },
        {
            domain: validSandboxTenant,
            clientId: validRequired,
            clientSecret: validRequired,
            timeoutMs: validPositiveInt,
        },
    );
};
