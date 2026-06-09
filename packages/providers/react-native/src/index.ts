// Main provider
export * from "./provider";

// Provider configuration
export * from "./provider.config";

// Types
export * from "./types";

// Errors
export * from "./errors";

// Utils (for advanced use)
export * from "./utils";

// Defaults
export { FAST_AUTH_AUTH0_DEFAULTS } from "@shared/core";

// Re-export Auth0Provider for convenience
export { Auth0Provider } from "react-native-auth0";
export type { Auth0Options } from "react-native-auth0";
export type { FastAuthNetwork } from "@shared/core";
