import type { Auth0ClientId, DappId } from "@shared/console-domain/dapp";
import { DappStatus } from "@shared/console-domain/dapp";
import type { ManagedClient } from "../../src/modules/provisioning/auth0-provisioner";
import type { ReconcileDapp } from "../../src/scripts/reconcile-report";
import { formatReport, reconcile } from "../../src/scripts/reconcile-report";

/**
 * Builds a reconcile dApp whose name derives from its id.
 * @param id The dApp id.
 * @param status The dApp status.
 * @param auth0ClientId The stored client id, or null for none.
 * @returns The dApp.
 */
const dapp = (id: string, status: ReconcileDapp["status"], auth0ClientId: string | null = null): ReconcileDapp => ({
    id: id as DappId,
    name: `dApp ${id}`,
    status,
    auth0ClientId: auth0ClientId as Auth0ClientId | null,
});

/**
 * Builds a tagged client whose name and callback derive from its id.
 * @param clientId The client id.
 * @param dappId The dApp id in its tag, or null for no tag.
 * @returns The client.
 */
const client = (clientId: string, dappId: string | null): ManagedClient => ({
    clientId: clientId as Auth0ClientId,
    dappId: dappId as DappId | null,
    name: `Client ${clientId}`,
    callbacks: [`https://${clientId}.example/callback`],
});

describe("reconcile", () => {
    it("should be clean when every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client", () => {
        const report = reconcile(
            [client("c1", "approved")],
            [
                dapp("approved", DappStatus.APPROVED, "c1"),
                dapp("rejected", DappStatus.REJECTED),
                dapp("removed", DappStatus.REMOVED, "gone"),
                dapp("pending", DappStatus.PENDING),
            ],
        );

        expect(report).toEqual({ clientCount: 1, dappCount: 4, orphanClients: [], missingClients: [] });
        expect(formatReport(report, "console-staging")).toBe(
            "Reconcile console-staging: 1 tagged Auth0 clients, 4 dApps in the database.\n" +
                "Clean: every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client.\n",
        );
    });

    it("should report tagged clients of removed or unknown dApps, and approved dApps whose client is missing", () => {
        const report = reconcile(
            [client("c1", "removed"), client("c2", "restored-away"), client("c3", null), client("c4", "approved")],
            [
                dapp("removed", DappStatus.REMOVED, "c1"),
                dapp("approved", DappStatus.APPROVED, "c4"),
                dapp("lost", DappStatus.APPROVED, "c9"),
                dapp("none", DappStatus.APPROVED),
            ],
        );

        expect(report.orphanClients).toEqual([
            { ...client("c1", "removed"), dappStatus: "removed" },
            { ...client("c2", "restored-away"), dappStatus: null },
            { ...client("c3", null), dappStatus: null },
        ]);
        expect(report.missingClients).toEqual([dapp("lost", DappStatus.APPROVED, "c9"), dapp("none", DappStatus.APPROVED)]);
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

    it("should report the tagged clients of pending and rejected dApps, and a second tagged client of an approved dApp", () => {
        const report = reconcile(
            [client("c1", "live"), client("dup", "live"), client("c2", "pending"), client("c3", "rejected")],
            [dapp("live", DappStatus.APPROVED, "c1"), dapp("pending", DappStatus.PENDING), dapp("rejected", DappStatus.REJECTED)],
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
