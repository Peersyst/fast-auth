import { FAST_AUTH_AUTH0_DEFAULTS } from "@shared/core";
import type { NearNetwork } from "../api/client";
import { DOCS_URL } from "./links";

type NetworkSettings = {
    name: string;
    signingAudience: string;
    fastAuthContract: string;
    mpcContract: string;
    resourcesUrl: string;
};

export const NEAR_NETWORKS: Record<NearNetwork, NetworkSettings> = {
    testnet: {
        name: "Testnet",
        signingAudience: FAST_AUTH_AUTH0_DEFAULTS.testnet.signingAudience,
        fastAuthContract: "fast-auth.testnet",
        mpcContract: "v1.signer-prod.testnet",
        resourcesUrl: `${DOCS_URL}/resources/testnet`,
    },
    mainnet: {
        name: "Mainnet",
        signingAudience: FAST_AUTH_AUTH0_DEFAULTS.mainnet.signingAudience,
        fastAuthContract: "fast-auth.near",
        mpcContract: "v1.signer",
        resourcesUrl: `${DOCS_URL}/resources/mainnet`,
    },
};
