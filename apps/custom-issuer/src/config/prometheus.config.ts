export interface PrometheusConfig {
    appName: string;
    env: string;
}

/**
 * Builds the Prometheus configuration.
 * @returns The Prometheus configuration.
 */
export default (): PrometheusConfig => {
    return {
        appName: process.env.APP_NAME || "custom-issuer",
        env: process.env.CONFIG_ENV || process.env.NODE_ENV || "development",
    };
};
