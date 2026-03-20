import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { IssuerModule } from "../issuer/issuer.module";

@Module({
    imports: [IssuerModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
