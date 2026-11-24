import configJson from "../config.json";

type FastAuthNetwork = "mainnet" | "testnet";

interface AuthConfig {
    auth0: {
        network: FastAuthNetwork;
        clientId: string;
        /** The NEAR Auth sandbox broker, which signs users in on the sandbox tenant, the issuer. */
        domain: string;
        issuer: string;
    };
    near: {
        mpcContractId: string;
        fastAuthContractId: string;
        fastNearApiBaseUrl: string;
    };
}

const config: AuthConfig = {
    auth0: {
        network: (import.meta.env.VITE_FAST_AUTH_NETWORK || configJson.auth0.network) as FastAuthNetwork,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || configJson.auth0.clientId,
        domain: import.meta.env.VITE_AUTH0_DOMAIN || configJson.auth0.domain,
        issuer: import.meta.env.VITE_AUTH0_ISSUER || configJson.auth0.issuer,
    },
    near: {
        mpcContractId: import.meta.env.VITE_NEAR_MPC_CONTRACT_ID || configJson.near.mpcContractId,
        fastAuthContractId: import.meta.env.VITE_NEAR_FAST_AUTH_CONTRACT_ID || configJson.near.fastAuthContractId,
        fastNearApiBaseUrl: import.meta.env.VITE_NEAR_FAST_NEAR_API_BASE_URL || configJson.near.fastNearApiBaseUrl,
    },
};

export default config;
