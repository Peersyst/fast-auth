import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import { AuthModule } from "../auth/auth.module";
import { DappModule } from "../dapp/dapp.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
    imports: [TypeOrmModule.forFeature([Dapp, DappEvent]), AuthModule, DappModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
