import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { Gauge, register } from "prom-client";
import { DataSource } from "typeorm";
import { DappStatus } from "../../domain/dapp";

const METRIC_NAME = "console_dapps";

@Injectable()
export class DappsGauge implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DappsGauge.name);

    constructor(private readonly dataSource: DataSource) {}

    onModuleInit(): void {
        const { dataSource, logger } = this;
        new Gauge({
            name: METRIC_NAME,
            help: "dApps per status",
            labelNames: ["status"],
            async collect() {
                try {
                    const rows: { status: DappStatus; count: number }[] = await dataSource.query(
                        "SELECT status, count(*)::int AS count FROM dapps GROUP BY status",
                    );
                    for (const status of Object.values(DappStatus)) {
                        this.set({ status }, rows.find((row) => row.status === status)?.count ?? 0);
                    }
                } catch (error) {
                    this.reset();
                    logger.warn(`Could not count dApps: ${error instanceof Error ? error.message : String(error)}`);
                }
            },
        });
    }

    onModuleDestroy(): void {
        register.removeSingleMetric(METRIC_NAME);
    }
}
