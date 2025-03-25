export type LoggerConfig = {
    logLevel: "error" | "info" | "verbose" | "debug";
    logFile: string;
};

/**
 * Builds the logger configuration.
 * @returns The logger configuration.
 */
export default (): LoggerConfig => {
    return {
        logLevel: "info",
        logFile: "app.log",
    };
};
