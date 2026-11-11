import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { createMetricsProvider } from "../common/metric/metric";
import { NotificationModule } from "../notification/notification.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { SettingModule } from "../setting/setting.module";
import { DappWriteService } from "./dapp-write.service";
import { DappController } from "./dapp.controller";
import { DappMetrics, DappMetricsProvider } from "./dapp.metrics";
import { DappNotifier } from "./dapp.notifier";
import { DappService } from "./dapp.service";

@Module({
    imports: [AuthModule, ProvisioningModule, NotificationModule, SettingModule],
    controllers: [DappController],
    providers: [DappService, DappWriteService, DappNotifier, ...createMetricsProvider(DappMetricsProvider, DappMetrics)],
    exports: [DappWriteService],
})
export class DappModule {}
