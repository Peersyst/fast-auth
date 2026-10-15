import type { Auth0ClientId, DappId } from "../domain/dapp";
import type { ManagedClient } from "../modules/provisioning/auth0-provisioner";
import type { ReconcileDapp } from "./reconcile-report";
import { formatReport, reconcile } from "./reconcile-report";

const dapp = (id: string, status: ReconcileDapp["status"], auth0ClientId: string | null = null): ReconcileDapp => ({
    id: id as DappId,
    name: `dApp ${id}`,
    status,
    auth0ClientId: auth0ClientId as Auth0ClientId | null,
});

const client = (clientId: string, dappId: string | null): ManagedClient => ({
    clientId: clientId as Auth0ClientId,
    dappId: dappId as DappId | null,
    name: `Client ${clientId}`,
    callbacks: [`https://${clientId}.example/callback`],
});

describe("reconcile", () => {
    it("is clean when every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client", () => {
        const report = reconcile(
            [client("c1", "approved")],
            [
                dapp("approved", "approved", "c1"),
                dapp("rejected", "rejected"),
                dapp("removed", "removed", "gone"),
                dapp("pending", "pending"),
            ],
        );

        expect(report).toEqual({ clientCount: 1, dappCount: 4, orphanClients: [], missingClients: [] });
        expect(formatReport(report, "console-staging")).toBe(
            "Reconcile console-staging: 1 tagged Auth0 clients, 4 dApps in the database.\n" +
                "Clean: every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client.\n",
        );
    });

    it("reports tagged clients of removed or unknown dApps, and approved dApps whose client is missing", () => {
        const report = reconcile(
            [client("c1", "removed"), client("c2", "restored-away"), client("c3", null), client("c4", "approved")],
            [
                dapp("removed", "removed", "c1"),
                dapp("approved", "approved", "c4"),
                dapp("lost", "approved", "c9"),
                dapp("none", "approved"),
            ],
        );

        expect(report.orphanClients).toEqual([
            { ...client("c1", "removed"), dappStatus: "removed" },
            { ...client("c2", "restored-away"), dappStatus: null },
            { ...client("c3", null), dappStatus: null },
        ]);
        expect(report.missingClients).toEqual([dapp("lost", "approved", "c9"), dapp("none", "approved")]);
        expect(formatReport(report, "console-production")).toBe(
            [
                "Reconcile console-production: 4 tagged Auth0 clients, 4 dApps in the database.",
                "",
                "Tagged clients that no approved dApp uses (3):",
                '  - c1 "Client c1" (dApp removed removed)',
                "    callbacks: https://c1.example/callback",
                '  - c2 "Client c2" (dApp restored-away not in the database)',
                "    callbacks: https://c2.example/callback",
                '  - c3 "Client c3" (no console_dapp_id tag)',
                "    callbacks: https://c3.example/callback",
                "",
                "Approved dApps whose client is missing (2):",
                '  - dApp lost "dApp lost": client c9 is not among the tagged clients',
                '  - dApp none "dApp none": has no client stored',
                "",
                "Nothing was deleted. Remove an orphan client by hand once nobody uses it.",
                "",
            ].join("\n"),
        );
    });

    it("reports the tagged clients of pending and rejected dApps, and a second tagged client of an approved dApp", () => {
        const report = reconcile(
            [client("c1", "live"), client("dup", "live"), client("c2", "pending"), client("c3", "rejected")],
            [dapp("live", "approved", "c1"), dapp("pending", "pending"), dapp("rejected", "rejected")],
        );

        expect(report.orphanClients).toEqual([
            { ...client("dup", "live"), dappStatus: "approved" },
            { ...client("c2", "pending"), dappStatus: "pending" },
            { ...client("c3", "rejected"), dappStatus: "rejected" },
        ]);
        expect(report.missingClients).toEqual([]);
        expect(
            formatReport(report, "console-staging")
                .split("\n")
                .filter((line) => line.startsWith("  - ")),
        ).toEqual([
            '  - dup "Client dup" (dApp live approved, which uses another client)',
            '  - c2 "Client c2" (dApp pending pending)',
            '  - c3 "Client c3" (dApp rejected rejected)',
        ]);
    });
});
