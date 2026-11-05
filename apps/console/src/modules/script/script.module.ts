import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { DappModule } from "../dapp/dapp.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { SettingModule } from "../setting/setting.module";
import { AnonymiseCommand } from "./anonymise.command";
import { ReconcileCommand } from "./reconcile.command";

@Module({
    imports: [ProvisioningModule, DappModule, AdminModule, SettingModule],
    providers: [ReconcileCommand, AnonymiseCommand],
})
export class ScriptModule {}
