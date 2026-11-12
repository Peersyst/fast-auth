import { createConfig } from "@frontend/config";
import "./config.types";

const DOCS_URL = "https://docs.auth.near.org";

/**
 * The console API origin the console-web image serves in /env.js at startup, so one image serves every environment.
 */
const runtimeBackendUrl = (globalThis as { __CONSOLE_ENV__?: { BACKEND_URL?: string } }).__CONSOLE_ENV__?.BACKEND_URL;

/**
 * Static config which is the base of the config.
 * It can be overridden by the ConfigManager.
 */
const config = createConfig({
    projectName: "console-web",
    ...(runtimeBackendUrl && { backendUrl: runtimeBackendUrl }),
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
