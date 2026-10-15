import { Module } from "@nestjs/common";
import { ClientConfigController } from "./client-config.controller";

@Module({
    controllers: [ClientConfigController],
})
export class ClientConfigModule {}
