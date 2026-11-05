import { DappStatus } from "@shared/modules/dapp";
import { formatReport, reconcile, ReconcileDapp } from "../../../src/modules/script/reconcile-report";
import { ManagedClient } from "../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";

/**
 * Builds a tagged client.
 * @param clientId The client id.
 * @param dappId The dApp it names, or null for no tag.
 * @returns The client.
 */
const client = (clientId: string, dappId: string | null): ManagedClient => ({
    clientId,
    dappId,
    name: `Client ${clientId}`,
    callbacks: [],
});
/**
 * Builds a dApp row as the reconcile script reads it.
 * @param id The dApp id.
 * @param status The status.
 * @param auth0ClientId The stored client id.
 * @returns The dApp.
 */
const dapp = (id: string, status: DappStatus, auth0ClientId: string | null): ReconcileDapp => ({
    id,
    name: `dApp ${id}`,
    status,
    auth0ClientId,
});

describe("reconcile", () => {
    it("should list the tagged clients no approved dApp uses and the approved dApps whose client is missing", () => {
        const report = reconcile(
            [
                client("c-used", "d-approved"),
                client("c-pending", "d-pending"),
                client("c-second", "d-approved"),
                client("c-ghost", "d-ghost"),
                client("c-untagged", null),
            ],
            [
                dapp("d-approved", DappStatus.APPROVED, "c-used"),
                dapp("d-pending", DappStatus.PENDING, null),
                dapp("d-missing", DappStatus.APPROVED, "c-gone"),
            ],
        );

        expect(report.orphanClients.map(({ clientId, dappStatus }) => [clientId, dappStatus])).toEqual([
            ["c-pending", DappStatus.PENDING],
            ["c-second", DappStatus.APPROVED],
            ["c-ghost", null],
            ["c-untagged", null],
        ]);
        expect(report.missingClients.map(({ id }) => id)).toEqual(["d-missing"]);
        expect(report).toMatchObject({ clientCount: 5, dappCount: 3 });
    });

    it("should report a clean state in one line after the counts", () => {
        const report = reconcile([client("c-used", "d-approved")], [dapp("d-approved", DappStatus.APPROVED, "c-used")]);

        expect(formatReport(report, "console-test")).toBe(
            "Reconcile console-test: 1 tagged Auth0 clients, 1 dApps in the database.\n" +
                "Clean: every tagged client belongs to an approved dApp that uses it, and every approved dApp has its client.\n",
        );
    });

    it("should describe each orphan by its dApp's state and each missing client by what is wrong", () => {
        const report = reconcile(
            [client("c-pending", "d-pending"), client("c-untagged", null)],
            [dapp("d-pending", DappStatus.PENDING, null), dapp("d-none", DappStatus.APPROVED, null)],
        );

        expect(formatReport(report, "console-test")).toBe(
            [
                "Reconcile console-test: 2 tagged Auth0 clients, 2 dApps in the database.",
                "",
                "Tagged clients that no approved dApp uses (2):",
                '  - c-pending "Client c-pending" (dApp d-pending pending)',
                "    callbacks: none",
                '  - c-untagged "Client c-untagged" (no console_dapp_id tag)',
                "    callbacks: none",
                "",
                "Approved dApps whose client is missing (1):",
                '  - dApp d-none "dApp d-none": has no client stored',
                "",
                "Nothing was deleted. Remove an orphan client by hand once nobody uses it.",
                "",
            ].join("\n"),
        );
    });
});
