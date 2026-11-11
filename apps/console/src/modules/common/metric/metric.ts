import { Provider } from "@nestjs/common";
import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";

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
            switch (metrics[name].type) {
                case "counter":
                    return makeCounterProvider({
                        name: name,
                        help: metrics[name].help,
                        ...(metrics[name].labelNames ? { labelNames: metrics[name].labelNames } : {}),
                    });
                case "gauge":
                    return makeGaugeProvider({
                        name: name,
                        help: metrics[name].help,
                        ...(metrics[name].labelNames ? { labelNames: metrics[name].labelNames } : {}),
                    });
                case "histogram":
                    return makeHistogramProvider({
                        name: name,
                        help: metrics[name].help,
                        ...(metrics[name].labelNames ? { labelNames: metrics[name].labelNames } : {}),
                        ...(metrics[name].buckets ? { buckets: metrics[name].buckets } : {}),
                    });
                default:
                    throw new Error("Unknown metric type");
            }
        }),
    ];
};
