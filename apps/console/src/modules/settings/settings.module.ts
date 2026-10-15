import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsRepository } from "./settings.repository";
import { SettingsService } from "./settings.service";

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, SettingsRepository],
    exports: [SettingsRepository],
})
export class SettingsModule {}
