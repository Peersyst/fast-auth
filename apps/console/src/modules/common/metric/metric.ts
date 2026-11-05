import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";
import { Provider } from "@nestjs/common";

export type MetricType = "counter" | "gauge" | "histogram";
export type ModuleMetric = { type: MetricType; help: string; labelNames?: string[]; buckets?: number[] };
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
            const { type, ...options } = metrics[name];
            switch (type) {
                case "counter":
                    return makeCounterProvider({ name, ...options });
                case "gauge":
                    return makeGaugeProvider({ name, ...options });
                case "histogram":
                    return makeHistogramProvider({ name, ...options });
                default:
                    throw new Error("Unknown metric type");
            }
        }),
    ];
};
