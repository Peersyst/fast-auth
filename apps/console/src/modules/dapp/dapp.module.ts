import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
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
    imports: [TypeOrmModule.forFeature([Dapp, DappEvent]), AuthModule, ProvisioningModule, NotificationModule, SettingModule],
    controllers: [DappController],
    providers: [DappService, DappWriteService, DappNotifier, ...createMetricsProvider(DappMetricsProvider, DappMetrics)],
    exports: [DappService, DappWriteService, DappNotifier],
})
export class DappModule {}
