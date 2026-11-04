import type { Dapp } from "@shared/console-domain/dapp";
import { DappStatus } from "@shared/console-domain/dapp";
import type { ManagedClient } from "../modules/provisioning/auth0-provisioner";

export type ReconcileDapp = Pick<Dapp, "id" | "name" | "status" | "auth0ClientId">;

type OrphanClient = ManagedClient & { dappStatus: DappStatus | null };

const DAPP_STATE: Record<DappStatus, string> = {
    [DappStatus.PENDING]: "pending",
    [DappStatus.APPROVED]: "approved, which uses another client",
    [DappStatus.REJECTED]: "rejected",
    [DappStatus.REMOVED]: "removed",
};

export type ReconcileReport = {
    clientCount: number;
    dappCount: number;
    orphanClients: OrphanClient[];
    missingClients: ReconcileDapp[];
};

/**
 * Compares the tagged Auth0 clients with the dApps, without changing either.
 * @param clients The Auth0 clients tagged for this environment.
 * @param dapps Every dApp in the database.
 * @returns The counts, the clients no approved dApp uses and the approved dApps whose client is missing.
 */
export function reconcile(clients: readonly ManagedClient[], dapps: readonly ReconcileDapp[]): ReconcileReport {
    const dappsById = new Map(dapps.map((dapp) => [dapp.id, dapp]));
    const clientIds = new Set(clients.map((client) => client.clientId));
    const orphanClients = clients.flatMap((client): OrphanClient[] => {
        const dapp = client.dappId === null ? undefined : dappsById.get(client.dappId);
        if (dapp === undefined) return [{ ...client, dappStatus: null }];
        return dapp.status === DappStatus.APPROVED && dapp.auth0ClientId === client.clientId
            ? []
            : [{ ...client, dappStatus: dapp.status }];
    });
    const missingClients = dapps.filter(
        (dapp) => dapp.status === DappStatus.APPROVED && (dapp.auth0ClientId === null || !clientIds.has(dapp.auth0ClientId)),
    );
    return { clientCount: clients.length, dappCount: dapps.length, orphanClients, missingClients };
}

/**
 * Renders the report as the lines the reconcile script prints.
 * @param report The reconcile report.
 * @param managedBy The tag the clients were listed by.
 * @returns The report text, ending in a newline.
 */
export function formatReport(report: ReconcileReport, managedBy: string): string {
    const lines = [`Reconcile ${managedBy}: ${report.clientCount} tagged Auth0 clients, ${report.dappCount} dApps in the database.`];
    if (report.orphanClients.length === 0 && report.missingClients.length === 0) {
        lines.push("Clean: every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client.");
        return `${lines.join("\n")}\n`;
    }
    lines.push("", `Tagged clients that no approved dApp uses (${report.orphanClients.length}):`);
    for (const client of report.orphanClients) {
        const state = client.dappStatus === null ? "not in the database" : DAPP_STATE[client.dappStatus];
        const dapp = client.dappId === null ? "no console_dapp_id tag" : `dApp ${client.dappId} ${state}`;
        lines.push(`  - ${client.clientId} "${client.name}" (${dapp})`, `    callbacks: ${client.callbacks.join(", ") || "none"}`);
    }
    lines.push("", `Approved dApps whose client is missing (${report.missingClients.length}):`);
    for (const dapp of report.missingClients) {
        const problem =
            dapp.auth0ClientId === null ? "has no client stored" : `client ${dapp.auth0ClientId} is not among the tagged clients`;
        lines.push(`  - dApp ${dapp.id} "${dapp.name}": ${problem}`);
    }
    lines.push("", "Nothing was deleted. Remove an orphan client by hand once nobody uses it.");
    return `${lines.join("\n")}\n`;
}
