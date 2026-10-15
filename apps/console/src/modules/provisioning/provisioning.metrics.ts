import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Gauge, Histogram } from "prom-client";

export type Auth0Call = "list" | "get" | "create" | "update" | "delete" | "list_connections" | "update_connection";

export type Auth0Outcome = "success" | "not_found" | "rate_limited" | "rejected" | "failed";

export const ProvisioningMetric = {
    Auth0RequestDurationSeconds: "console_auth0_request_duration_seconds",
    Auth0Up: "console_auth0_up",
} as const;

@Injectable()
export class ProvisioningMetrics {
    constructor(
        @InjectMetric(ProvisioningMetric.Auth0RequestDurationSeconds) private readonly requests: Histogram<string>,
        @InjectMetric(ProvisioningMetric.Auth0Up) private readonly up: Gauge<string>,
    ) {}

    startAuth0Request(op: Auth0Call): (outcome: Auth0Outcome) => void {
        const end = this.requests.startTimer({ op });
        return (outcome) => end({ outcome });
    }

    setAuth0Up(up: boolean): void {
        this.up.set(up ? 1 : 0);
    }
}
