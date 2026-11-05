import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting, SettingEvent } from "@database/console/entities";
import { AuthModule } from "../auth/auth.module";
import { SettingController } from "./setting.controller";
import { SettingService } from "./setting.service";

@Module({
    imports: [TypeOrmModule.forFeature([Setting, SettingEvent]), AuthModule],
    controllers: [SettingController],
    providers: [SettingService],
    exports: [SettingService],
})
export class SettingModule {}
