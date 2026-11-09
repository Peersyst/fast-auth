import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SettingController } from "./setting.controller";
import { SettingService } from "./setting.service";

@Module({
    imports: [AuthModule],
    controllers: [SettingController],
    providers: [SettingService],
    exports: [SettingService],
})
export class SettingModule {}
