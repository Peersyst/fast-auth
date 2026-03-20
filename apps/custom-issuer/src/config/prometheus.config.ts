export interface PrometheusConfig {
    appName: string;
}

/**
 * Builds the Prometheus configuration.
 * @returns The Prometheus configuration.
 */
export default (): PrometheusConfig => {
    return {
        appName: process.env.APP_NAME || "custom-issuer",
    };
};
