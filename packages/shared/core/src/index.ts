export type FastAuthNetwork = "mainnet" | "testnet";

export type FastAuthAuth0NetworkDefaults = {
    domain: string;
    audience: string;
    signingAudience: string;
};

export const FAST_AUTH_AUTH0_DEFAULTS: Record<FastAuthNetwork, FastAuthAuth0NetworkDefaults> = {
    mainnet: {
        domain: "login.auth.near.org",
        audience: "https://api.auth.near.org",
        signingAudience: "auth0.jwt.fast-auth.near",
    },
    testnet: {
        domain: "login.testnet.fast-auth.com",
        audience: "https://api.testnet.fast-auth.com",
        signingAudience: "auth0.jwt.fast-auth.testnet",
    },
} as const;

export type FastAuthTestingTenant = "testnet" | "mainnet-testing";

export type FastAuthTestingTenantConfig = {
    domain: string;
    signingAudience: string;
    loginUrl: string;
};

/**
 * The open testing Auth0 tenants. Any dapp may use them without registering. The domains and login pages mirror
 * `apps/console-web/login/<tenant>/config.json`, and a test keeps them in step.
 * A value that starts with `TO_REPLACE` is a placeholder until the tenant is provisioned.
 */
export const FAST_AUTH_TESTING_TENANTS: Record<FastAuthTestingTenant, FastAuthTestingTenantConfig> = {
    testnet: {
        domain: "login.testnet.fast-auth.com",
        signingAudience: "auth0.jwt.fast-auth.testnet",
        loginUrl: "https://console-staging.aws.peersyst.tech/login/testnet/",
    },
    "mainnet-testing": {
        domain: "TO_REPLACE_WITH_MAINNET_TESTING_DOMAIN",
        signingAudience: "TO_REPLACE_WITH_MAINNET_TESTING_AUDIENCE",
        loginUrl: "https://console-staging.aws.peersyst.tech/login/mainnet-testing/",
    },
} as const;

export type {
    User,
    LoginResponse,
    RequestTransactionSignatureResponse,
    RequestDelegateActionSignatureResponse,
    RequestMessageSignatureResponse,
    GetSignatureRequestResponse,
    IFastAuthProvider,
    MPCContractAlgorithm,
    SignatureRequest,
} from "./provider";

export { encodeSignMessage } from "./nep413";
export type { SignMessageParams } from "./nep413";
