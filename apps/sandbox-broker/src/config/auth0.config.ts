import { buildConfig, validHostName, validRequired } from "@backend/config";

export interface Auth0Config {
    /** The sandbox tenant. */
    domain: string;
    /** Every client of a tenant can sign for its accounts, so the open sandbox must never run on this one. */
    productionDomain: string;
    /** The broker's client, a public one like every other: no secret, and the broker as its only callback. */
    clientId: string;
}

/**
 * Builds the Auth0 configuration.
 * @returns The Auth0 configuration.
 */
export default (): Auth0Config => {
    const config = buildConfig<Auth0Config>(
        {
            domain: "login.testnet.fast-auth.com",
            productionDomain: "login.auth.near.org",
            clientId: process.env.AUTH0_CLIENT_ID!,
        },
        { domain: validHostName, clientId: validRequired },
    );
    if (config.domain === config.productionDomain) throw new Error("The sandbox broker must not run on the production tenant");
    return config;
};
