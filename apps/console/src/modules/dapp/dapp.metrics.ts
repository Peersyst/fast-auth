import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Gauge } from "prom-client";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
import { DappStatus } from "@shared/modules/dapp";
import { ModuleMetrics } from "../common/metric/metric";

export type TransitionAction = "create" | "autoApprove" | "approve" | "reject";

export enum DappMetric {
    TRANSITIONS = "console_transitions_total",
    DAPPS = "console_dapps",
}

export const DappMetrics: ModuleMetrics = {
    [DappMetric.TRANSITIONS]: {
        type: "counter",
        help: "dApp use cases run, by action and result (success, the error code, or error for an unexpected failure)",
        labelNames: ["action", "result"],
    },
    [DappMetric.DAPPS]: {
        type: "gauge",
        help: "dApps per status",
        labelNames: ["status"],
    },
};

@Injectable()
export class DappMetricsProvider implements OnModuleInit {
    private readonly logger = new Logger(DappMetricsProvider.name);

    constructor(
        @InjectMetric(DappMetric.TRANSITIONS) private readonly transitionsMetric: Counter<string>,
        @InjectMetric(DappMetric.DAPPS) private readonly dappsMetric: Gauge<string>,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Counts the dApps per status in the database on each scrape, resetting the gauge when the query fails.
     */
    onModuleInit(): void {
        const { dataSource, logger } = this;
        // prom-client runs a metric's collect before each scrape. The gauge is built before the data source can be injected.
        Object.assign(this.dappsMetric, {
            async collect(this: Gauge<string>): Promise<void> {
                try {
                    const statuses = Object.values(DappStatus);
                    const counts = await Promise.all(statuses.map((status) => dataSource.manager.countBy(Dapp, { status })));
                    statuses.forEach((status, index) => this.set({ status }, counts[index]));
                } catch (error) {
                    this.reset();
                    logger.warn(`Could not count dApps: ${error instanceof Error ? error.message : String(error)}`);
                }
            },
        });
    }

    /**
     * Counts one run of a use case.
     * @param action The use case.
     * @param result The outcome, as success, the error code it refused with, or error for an unexpected failure.
     */
    countTransition(action: TransitionAction, result: string): void {
        this.transitionsMetric.inc({ action, result });
    }
}
