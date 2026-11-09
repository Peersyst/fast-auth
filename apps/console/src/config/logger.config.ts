import { buildConfig } from "@backend/config";

interface LoggerConfig {
    logLevel: "error" | "info" | "verbose" | "debug";
    logFile: string;
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
        logFile: "app.log",
    });
};
