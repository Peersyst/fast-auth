import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Histogram } from "prom-client";
import { ModuleMetrics } from "../common/metric/metric";

export type Auth0Call = "get" | "create" | "update" | "list_connections" | "update_connection";

export type Auth0Outcome = "success" | "rate_limited" | "rejected" | "failed";

export enum ProvisioningMetric {
    AUTH0_REQUEST_DURATION_SECONDS = "console_auth0_request_duration_seconds",
}

export const ProvisioningMetrics: ModuleMetrics = {
    [ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS]: {
        type: "histogram",
        help: "Duration of Auth0 Management API calls in seconds, including any token request they wait on, by operation and outcome",
        labelNames: ["op", "outcome"],
        buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    },
};

@Injectable()
export class ProvisioningMetricsProvider {
    constructor(
        @InjectMetric(ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS) private readonly auth0RequestDurationMetric: Histogram<string>,
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
}
