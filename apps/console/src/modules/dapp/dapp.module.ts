import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { createMetricsProvider } from "../common/metric/metric";
import { NotificationModule } from "../notification/notification.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { DappClientController } from "./dapp-client.controller";
import { DappController } from "./dapp.controller";
import { DappReviewController } from "./dapp-review.controller";
import { DappMetrics, DappMetricsProvider } from "./dapp.metrics";
import { DappService } from "./dapp.service";

@Module({
    imports: [AuthModule, ProvisioningModule, NotificationModule],
    // DappClientController comes first so that GET /dapp/client does not reach the guarded GET /dapp/:id.
    controllers: [DappClientController, DappController, DappReviewController],
    providers: [DappService, ...createMetricsProvider(DappMetricsProvider, DappMetrics)],
})
export class DappModule {}
