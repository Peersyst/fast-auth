import { ModuleMetrics } from "../common/metric/metric";
import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";

export enum FastAuthRelayerMetric {
    SIGN_TOTAL = "sign_total",
    SIGN_FAILED = "sign_failed",
}

export const RelayerMetrics: ModuleMetrics = {
    [FastAuthRelayerMetric.SIGN_TOTAL]: {
        type: "counter",
        help: "# of signs",
    },
    [FastAuthRelayerMetric.SIGN_FAILED]: {
        type: "counter",
        help: "# of sign failures",
    },
};

@Injectable()
export class FastAuthRelayerMetricsProvider {
    constructor(
        @InjectMetric(FastAuthRelayerMetric.SIGN_TOTAL) private readonly signTotalMetric: Counter<string>,
        @InjectMetric(FastAuthRelayerMetric.SIGN_FAILED) private readonly signFailedMetric: Counter<string>,
    ) {}

    /**
     * Triggers a sign event.
     */
    sign() {
        this.signTotalMetric.inc();
    }

    /**
     * Triggers a sign failed event.
     */
    signFailed() {
        this.signFailedMetric.inc();
    }
}
