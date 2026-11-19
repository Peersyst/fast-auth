import { Module } from "@nestjs/common";
import { BrokerController } from "./broker.controller";
import { BrokerService } from "./broker.service";

@Module({
    controllers: [BrokerController],
    providers: [BrokerService],
})
export class BrokerModule {}
