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

export type {
    User,
    LoginResponse,
    RequestTransactionSignatureResponse,
    RequestDelegateActionSignatureResponse,
    GetSignatureRequestResponse,
    IFastAuthProvider,
    MPCContractAlgorithm,
    SignatureRequest,
} from "./provider";
