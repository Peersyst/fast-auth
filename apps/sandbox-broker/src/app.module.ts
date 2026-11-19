import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config";
import { BrokerModule } from "./modules/broker/broker.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
    imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true }), HealthModule, BrokerModule],
})
export class AppModule {}
