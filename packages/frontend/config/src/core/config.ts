import { CoreConfig, NearNetwork } from "./types";

/**
 * Static config which is the base of the config.
 */
export const config: CoreConfig = {
    backendUrl: process.env.BACKEND_URL || "",
    auth0Domain: process.env.AUTH0_LOGIN_DOMAIN || "",
    auth0ClientId: process.env.AUTH0_CLIENT_ID || "",
    nearNetwork: (process.env.NEAR_NETWORK as NearNetwork) || "testnet",
};
