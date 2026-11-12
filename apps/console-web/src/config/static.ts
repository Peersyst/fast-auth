import { createConfig } from "@frontend/config";
import "./config.types";

const DOCS_URL = "https://docs.auth.near.org";

/**
 * Static config which is the base of the config.
 */
const config = createConfig({
    docsUrl: DOCS_URL,
    applyDocsUrl: `${DOCS_URL}/home/apply`,
    supportUrl: "https://discord.gg/JZfwEt82ur",
    nearNetworks: {
        testnet: {
            signingAudience: "auth0.jwt.fast-auth.testnet",
            fastAuthContract: "fast-auth.testnet",
            mpcContract: "v1.signer-prod.testnet",
            resourcesUrl: `${DOCS_URL}/resources/testnet`,
        },
        mainnet: {
            signingAudience: "auth0.jwt.fast-auth.near",
            fastAuthContract: "fast-auth.near",
            mpcContract: "v1.signer",
            resourcesUrl: `${DOCS_URL}/resources/mainnet`,
        },
    },
});

export default config;
