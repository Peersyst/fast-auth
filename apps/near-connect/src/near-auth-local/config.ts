import * as real from "../near-auth/config";

export * from "../near-auth/config";

export const getConfig: typeof real.getConfig = (network) =>
    network === "testnet" ? { ...real.getConfig(network), relayerBaseUrl: "http://localhost:3001/api" } : real.getConfig(network);
