import { Inject, Injectable } from "@nestjs/common";
import { getConfigEnv } from "@backend/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command } from "nestjs-command";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
import { managedByTag } from "../provisioning/providers/auth0-management/auth0-management.service";
import { AUTH0_PROVISIONER } from "../provisioning/provisioning.tokens";
import type { IAuth0ProvisionerService } from "../provisioning/interfaces/i-auth0-provisioner.service";
import { formatReport, reconcile, ReconcileReport } from "./reconcile-report";

@Injectable()
export class ReconcileCommand {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: IAuth0ProvisionerService,
    ) {}

    /**
     * Prints the orphan and missing Auth0 clients without changing anything, exiting with 0 when clean, 1 when it lists something and 2 when it fails.
     */
    @Command({ command: "reconcile", describe: "List orphan and missing Auth0 clients, changing nothing" })
    async run(): Promise<void> {
        try {
            const report = await this.report();
            process.stdout.write(formatReport(report, managedByTag(getConfigEnv())));
            process.exitCode = report.orphanClients.length + report.missingClients.length > 0 ? 1 : 0;
        } catch (error) {
            process.stderr.write(`reconcile failed: ${error instanceof Error ? error.message : String(error)}\n`);
            process.exitCode = 2;
        }
    }

    /**
     * Lists the tagged Auth0 clients and the dApps, and compares them.
     * @returns The reconcile report.
     */
    async report(): Promise<ReconcileReport> {
        const clients = await this.provisioner.listClients();
        const dapps = await this.dataSource.manager.find(Dapp, { select: { id: true, name: true, status: true, auth0ClientId: true } });
        return reconcile(clients, dapps);
    }
}
