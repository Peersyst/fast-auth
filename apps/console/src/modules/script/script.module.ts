import { Module } from "@nestjs/common";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { AnonymiseCommand } from "./anonymise.command";
import { ReconcileCommand } from "./reconcile.command";

@Module({
    imports: [ProvisioningModule],
    providers: [ReconcileCommand, AnonymiseCommand],
})
export class ScriptModule {}
