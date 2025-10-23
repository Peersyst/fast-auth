import { makeCounterProvider } from "@willsoto/nestjs-prometheus";
import { Provider } from "@nestjs/common";

export type MetricType = "counter";
export type ModuleMetric = { type: MetricType; help: string };
export type ModuleMetrics = Record<string, ModuleMetric>;

/**
 * Compose DI providers for the given metrics plus a base provider.
 * @param provider The base provider.
 * @param metrics The set of metrics.
 * @returns All the composed providers.
 */
export const createMetricsProvider = (provider: Provider, metrics: ModuleMetrics): Provider[] => {
    return [
        provider,
        ...Object.keys(metrics).map((name: string): Provider => {
            switch (metrics[name].type) {
                case "counter":
                    return makeCounterProvider({
                        name: name,
                        help: metrics[name].help,
                    });
                default:
                    throw new Error("Unknown metric type");
            }
        }),
    ];
};
