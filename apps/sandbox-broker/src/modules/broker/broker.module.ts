import { Module } from "@nestjs/common";
import { Auth0TokenClient } from "./auth0-token.client";
import { BrokerController } from "./broker.controller";
import { BrokerService } from "./broker.service";

@Module({
    controllers: [BrokerController],
    providers: [BrokerService, Auth0TokenClient],
})
export class BrokerModule {}
