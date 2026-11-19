import { buildConfig } from "@backend/config";

export interface LoggerConfig {
    logLevel: "error" | "info" | "verbose" | "debug";
}

/**
 * Builds the logger configuration.
 * @returns The logger configuration.
 */
export default (): LoggerConfig => {
    return buildConfig<LoggerConfig>({
        logLevel: {
            default: "info",
            development: "debug",
        },
    });
};
