import { Module } from "@nestjs/common";
import { makeCounterProvider } from "@willsoto/nestjs-prometheus";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { SettingsModule } from "../settings/settings.module";
import { DappsController } from "./dapps.controller";
import { DappsGauge } from "./dapps.gauge";
import { DappsMetric, DappsMetrics } from "./dapps.metrics";
import { DappsNotifier } from "./dapps.notifier";
import { DappsService } from "./dapps.service";
import { DappEventsRepository } from "./repositories/dapp-events.repository";
import { DappsRepository } from "./repositories/dapps.repository";

@Module({
    imports: [ProvisioningModule, NotificationsModule, SettingsModule],
    controllers: [DappsController],
    providers: [
        DappsService,
        DappsNotifier,
        DappsRepository,
        DappEventsRepository,
        DappsGauge,
        DappsMetrics,
        makeCounterProvider({
            name: DappsMetric.TRANSITIONS,
            help: "dApp use cases run, by action and result (success, the error code, or error for an unexpected failure)",
            labelNames: ["action", "result"],
        }),
        makeCounterProvider({
            name: DappsMetric.EMAILS,
            help: "Emails sent after a dApp change, by template and result (sent or failed)",
            labelNames: ["template", "result"],
        }),
    ],
    exports: [DappsService],
})
export class DappsModule {}
