import type { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module";
import { loadConfig } from "../config";
import { DappEntity } from "../modules/dapps/entities/dapp.entity";
import { managedByTag } from "../modules/provisioning/auth0-management.provisioner";
import type { Auth0Provisioner } from "../modules/provisioning/auth0-provisioner";
import { AUTH0_PROVISIONER } from "../modules/provisioning/auth0-provisioner";
import type { ReconcileReport } from "./reconcile-report";
import { formatReport, reconcile } from "./reconcile-report";
import { runScript } from "./run-script";

/**
 * Lists the tagged Auth0 clients and the dApps through the app's provisioner and database, and compares them.
 * @param app The Nest application context.
 * @returns The reconcile report.
 */
export async function runReconcile(app: INestApplicationContext): Promise<ReconcileReport> {
    const clients = await app.get<Auth0Provisioner>(AUTH0_PROVISIONER).listClients();
    const dapps = await app
        .get(DataSource)
        .manager.find(DappEntity, { select: { id: true, name: true, status: true, auth0ClientId: true } });
    return reconcile(clients, dapps);
}

/**
 * Prints the reconcile report and sets the exit code to 1 when it lists anything.
 */
async function main(): Promise<void> {
    const config = loadConfig();
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(config), { logger: ["error", "warn"], abortOnError: false });
    try {
        const report = await runReconcile(app);
        process.stdout.write(formatReport(report, managedByTag(config.server.env)));
        process.exitCode = report.orphanClients.length + report.missingClients.length > 0 ? 1 : 0;
    } finally {
        await app.close();
    }
}

if (require.main === module) runScript("reconcile", main, 2);
