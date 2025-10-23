import { Module } from "@nestjs/common";
import { RelayerController } from "./relayer.controller";
import { RelayerService } from "./relayer.service";
import { NearModule } from "../near/near.module";
import { RelayerMetrics, FastAuthRelayerMetricsProvider } from "./relayer.metrics";
import { createMetricsProvider } from "../common/metric/metric";

@Module({
    imports: [NearModule],
    controllers: [RelayerController],
    providers: [RelayerService, ...createMetricsProvider(FastAuthRelayerMetricsProvider, RelayerMetrics)],
})
export class RelayerModule {}
