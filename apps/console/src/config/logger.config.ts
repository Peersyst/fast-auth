import { buildConfig, validOneOf } from "@backend/config";

const LOG_LEVELS = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

export interface LoggerConfig {
    logLevel: string;
    /** Also writes the logs to this file when set. */
    logFile: string | undefined;
}

/**
 * Builds the logger configuration.
 * @returns The logger configuration.
 */
export default (): LoggerConfig => {
    return buildConfig<LoggerConfig>(
        {
            logLevel: process.env.LOG_LEVEL || { default: "info", test: "warn" },
            logFile: process.env.LOG_FILE || undefined,
        },
        { logLevel: validOneOf(LOG_LEVELS) },
    );
};
