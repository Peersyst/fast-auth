import { Module } from "@nestjs/common";
import { DappsModule } from "../dapps/dapps.module";
import { AdminController } from "./admin.controller";

@Module({
    imports: [DappsModule],
    controllers: [AdminController],
})
export class AdminModule {}
