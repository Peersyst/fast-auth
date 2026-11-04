import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Gauge, Histogram } from "prom-client";

export type Auth0Call = "list" | "get" | "create" | "update" | "delete" | "list_connections" | "update_connection";

export type Auth0Outcome = "success" | "not_found" | "rate_limited" | "rejected" | "failed";

export enum ProvisioningMetric {
    AUTH0_REQUEST_DURATION_SECONDS = "console_auth0_request_duration_seconds",
    AUTH0_UP = "console_auth0_up",
}

@Injectable()
export class ProvisioningMetrics {
    constructor(
        @InjectMetric(ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS) private readonly requests: Histogram<string>,
        @InjectMetric(ProvisioningMetric.AUTH0_UP) private readonly up: Gauge<string>,
    ) {}

    /**
     * Starts timing one Auth0 call.
     * @param op The Auth0 call being timed.
     * @returns A function that records the call's duration under the outcome it is given.
     */
    startAuth0Request(op: Auth0Call): (outcome: Auth0Outcome) => void {
        const end = this.requests.startTimer({ op });
        return (outcome) => end({ outcome });
    }

    /**
     * Records the result of the latest Auth0 health check on the up gauge.
     * @param up Whether the check succeeded.
     */
    setAuth0Up(up: boolean): void {
        this.up.set(up ? 1 : 0);
    }
}
