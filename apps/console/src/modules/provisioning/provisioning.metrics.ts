import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Gauge, Histogram } from "prom-client";
import { ModuleMetrics } from "../common/metric/metric";

export type Auth0Call = "list" | "get" | "create" | "update" | "delete" | "list_connections" | "update_connection";

export type Auth0Outcome = "success" | "not_found" | "rate_limited" | "rejected" | "failed";

export enum ProvisioningMetric {
    AUTH0_REQUEST_DURATION_SECONDS = "console_auth0_request_duration_seconds",
    AUTH0_UP = "console_auth0_up",
}

export const ProvisioningMetrics: ModuleMetrics = {
    [ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS]: {
        type: "histogram",
        help: "Duration of Auth0 Management API calls in seconds, including any token request they wait on, by operation and outcome",
        labelNames: ["op", "outcome"],
        buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    },
    [ProvisioningMetric.AUTH0_UP]: {
        type: "gauge",
        help: "1 when the last Auth0 health check succeeded, 0 otherwise",
    },
};

@Injectable()
export class ProvisioningMetricsProvider {
    constructor(
        @InjectMetric(ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS) private readonly auth0RequestDurationMetric: Histogram<string>,
        @InjectMetric(ProvisioningMetric.AUTH0_UP) private readonly auth0UpMetric: Gauge<string>,
    ) {}

    /**
     * Starts timing one Auth0 call.
     * @param op The Auth0 call being timed.
     * @returns A function that records the call's duration under the outcome it is given.
     */
    startAuth0Request(op: Auth0Call): (outcome: Auth0Outcome) => void {
        const end = this.auth0RequestDurationMetric.startTimer({ op });
        return (outcome) => end({ outcome });
    }

    /**
     * Records the result of the latest Auth0 health check on the up gauge.
     * @param up Whether the check succeeded.
     */
    setAuth0Up(up: boolean): void {
        this.auth0UpMetric.set(up ? 1 : 0);
    }
}
