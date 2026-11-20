import routing from "../../dapps.json";
import type { Network } from "../utils/types";

interface NetworkConfig {
    auth0Domain: string;
    signingAudience: string;
    mpcContractId: string;
    fastAuthContractId: string;
    relayerBaseUrl: string;
    fastNearApiBaseUrl: string;
    fallbackRpcUrls: string[];
}

interface DappConfig {
    auth0ClientId: string;
}

const NEAR_AUTH_CONFIG: Record<Network, NetworkConfig> = {
    mainnet: {
        auth0Domain: "login.auth.near.org",
        signingAudience: "auth0.jwt.fast-auth.near",
        mpcContractId: "v1.signer",
        fastAuthContractId: "fast-auth.near",
        relayerBaseUrl: "https://fast-auth-production.aws.peersyst.tech/api",
        fastNearApiBaseUrl: "https://api.fastnear.com/v0",
        fallbackRpcUrls: ["https://rpc.mainnet.near.org", "https://free.rpc.fastnear.com"],
    },

    testnet: {
        auth0Domain: "login.testnet.fast-auth.com",
        signingAudience: "auth0.jwt.fast-auth.testnet",
        mpcContractId: "v1.signer-prod.testnet",
        fastAuthContractId: "fast-auth.testnet",
        relayerBaseUrl: "https://fast-auth-staging.aws.peersyst.tech/api",
        fastNearApiBaseUrl: "https://test.api.fastnear.com/v0",
        fallbackRpcUrls: ["https://rpc.testnet.near.org", "https://test.rpc.fastnear.com"],
    },
};

const DEFAULT_DAPP: Partial<Record<Network, DappConfig>> = routing.default;

const DAPPS: Record<string, Partial<Record<Network, DappConfig>>> = routing.dapps;

export const dappOrigin = () => new URL(window.selector.location).origin;

// The dapp picks the network, so an inherited key such as "constructor" must not match.
const findDapp = (network: Network): DappConfig | undefined =>
    Object.hasOwn(NEAR_AUTH_CONFIG, network) ? (DAPPS[dappOrigin()] ?? DEFAULT_DAPP)[network] : undefined;

export const isNearAuthAvailable = (network: Network): boolean => findDapp(network) !== undefined;

export const requireDapp = (network: Network): DappConfig => {
    const dapp = findDapp(network);
    if (!dapp) throw new Error(`NEAR Auth is not available for ${dappOrigin()} on ${network}`);
    return dapp;
};

export const getConfig = (network: Network): NetworkConfig & DappConfig => {
    const dapp = requireDapp(network);
    return { ...NEAR_AUTH_CONFIG[network], auth0ClientId: dapp.auth0ClientId };
};

export const getGuardId = (auth0Domain: string) => `jwt#https://${auth0Domain}/`;

export const getDerivationPath = (auth0Domain: string, sub: string) => `${getGuardId(auth0Domain)}#${sub}`;
