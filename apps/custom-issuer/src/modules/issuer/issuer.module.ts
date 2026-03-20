import { Module } from "@nestjs/common";
import { IssuerService } from "./issuer.service";
import { IssuerController } from "./issuer.controller";
import { KeyService } from "./key.service";
import { createMetricsProvider } from "../common/metric/metric";
import { IssuerMetricsProvider, IssuerMetrics } from "./issuer.metrics";

@Module({
    providers: [IssuerService, KeyService, ...createMetricsProvider(IssuerMetricsProvider, IssuerMetrics)],
    controllers: [IssuerController],
    exports: [KeyService],
})
export class IssuerModule {}
