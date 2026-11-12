import { CoreConfig } from "./types";

/**
 * Static config which is the base of the config.
 * It can be overridden by the ConfigManager.
 */
export const config: CoreConfig = {
    version: 0,
    projectName: "",
    publicUrl: "/",
    backendUrl: process.env.BACKEND_URL || "",
    configUrl: "/config.json",
    auth0Domain: "",
    auth0ClientId: "",
    nearNetwork: "testnet",
};
