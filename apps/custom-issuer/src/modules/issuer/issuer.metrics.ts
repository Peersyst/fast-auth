import { ModuleMetrics } from "../common/metric/metric";
import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";

export enum IssuerMetric {
    TOKENS_ISSUED_TOTAL = "custom_issuer_tokens_issued_total",
    TOKENS_FAILED_TOTAL = "custom_issuer_tokens_failed_total",
    ISSUE_DURATION_SECONDS = "custom_issuer_issue_duration_seconds",
}

export const IssuerMetrics: ModuleMetrics = {
    [IssuerMetric.TOKENS_ISSUED_TOTAL]: {
        type: "counter",
        help: "Total number of successfully issued tokens",
    },
    [IssuerMetric.TOKENS_FAILED_TOTAL]: {
        type: "counter",
        help: "Total number of failed token issuance attempts",
    },
    [IssuerMetric.ISSUE_DURATION_SECONDS]: {
        type: "histogram",
        help: "Duration of token issuance in seconds",
    },
};

@Injectable()
export class IssuerMetricsProvider {
    constructor(
        @InjectMetric(IssuerMetric.TOKENS_ISSUED_TOTAL) private readonly issuedMetric: Counter<string>,
        @InjectMetric(IssuerMetric.TOKENS_FAILED_TOTAL) private readonly failedMetric: Counter<string>,
        @InjectMetric(IssuerMetric.ISSUE_DURATION_SECONDS) private readonly durationMetric: Histogram<string>,
    ) {}

    incrementIssued(count = 1) {
        this.issuedMetric.inc(count);
    }

    incrementFailed(count = 1) {
        this.failedMetric.inc(count);
    }

    observeDuration(seconds: number) {
        this.durationMetric.observe(seconds);
    }
}
