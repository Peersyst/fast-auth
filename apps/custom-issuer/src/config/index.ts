import issuerConfig, { IssuerConfig } from "./issuer.config";
import prometheusConfig, { PrometheusConfig } from "./prometheus.config";

export type Config = {
    issuer: IssuerConfig;
    prometheus: PrometheusConfig;
};

export default (): Config => {
    return {
        issuer: issuerConfig(),
        prometheus: prometheusConfig(),
    };
};
