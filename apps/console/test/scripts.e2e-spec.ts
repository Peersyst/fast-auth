import { randomUUID } from "node:crypto";
import type { Auth0ClientId, Dapp, DappId } from "../src/domain/dapp";
import { DappEventEntity } from "../src/modules/dapps/entities/dapp-event.entity";
import { runAnonymise } from "../src/scripts/anonymise";
import { runReconcile } from "../src/scripts/reconcile";
import type { SeedState } from "../src/scripts/seed";
import { runSeed, seedFields, seedOwner } from "../src/scripts/seed";
import type { AdminDapp } from "./utils/contract";
import { dappForm, expectStatus, useConsoleApi } from "./utils/console-api";

describe("operational scripts", () => {
    const api = useConsoleApi();

    async function seed(): Promise<Record<SeedState, Dapp>> {
        const seeded = await runSeed(api.app);
        return Object.fromEntries(
            seeded.map(({ state, dapp }) => {
                if (dapp === null) throw new Error(`${state} was skipped`);
                return [state, dapp];
            }),
        ) as Record<SeedState, Dapp>;
    }

    async function rowsAsText(id: string): Promise<{ dapp: string; events: string }> {
        const [row] = await api.dataSource.query(
            `SELECT row_to_json(d)::text AS "dapp",
                    (SELECT string_agg(row_to_json(e)::text, E'\\n' ORDER BY e.seq) FROM dapp_events e WHERE e.dapp_id = d.id) AS "events"
             FROM dapps d WHERE d.id = $1`,
            [id],
        );
        return row;
    }

    async function insertEmailFailure(dappId: DappId, error: string): Promise<void> {
        await api.dataSource.manager.insert(DappEventEntity, {
            dappId,
            type: "email_failed",
            actorEmail: null,
            actorRole: "system",
            details: { template: "dapp_approved", error },
        });
    }

    describe("seed", () => {
        it("creates one dApp per state through the service, then skips owners that already have one", async () => {
            const dapps = await seed();

            expect(dapps.pending).toMatchObject({ status: "pending", ownerEmail: "seed-pending@example.com", auth0ClientId: null });
            expect(dapps.approved).toMatchObject({ status: "approved", pendingChange: null, auth0ClientId: expect.any(String) });
            expect(dapps["change-requested"]).toMatchObject({
                status: "approved",
                pendingChange: { name: "Seed change-requested v2" },
            });
            expect(dapps.rejected).toMatchObject({ status: "rejected", rejectionReason: expect.any(String) });
            expect(dapps.removed).toMatchObject({ status: "removed", removedBy: "seed-removed@example.com" });
            expect((await api.events(dapps.removed.id)).map((event) => event.type).sort()).toEqual([
                "approved",
                "auth0_created",
                "auth0_deleted",
                "email_sent",
                "email_sent",
                "removed",
                "submitted",
            ]);

            const again = await runSeed(api.app);

            expect(again.map(({ dapp }) => dapp)).toEqual([null, null, null, null, null]);
            expect(await api.dataSource.query("SELECT count(*)::int AS count FROM dapps")).toEqual([{ count: 5 }]);
        });

        it("refuses while auto-approval is on", async () => {
            await api.setAutoApproval(true);

            await expect(runSeed(api.app)).rejects.toThrow("Auto-approval is on");
        });
    });

    describe("reconcile", () => {
        it("is clean when the tagged clients and the approved dApps match", async () => {
            await seed();

            const report = await runReconcile(api.app);

            expect(report).toEqual({ clientCount: 2, dappCount: 5, orphanClients: [], missingClients: [] });
        });

        it("reports tagged clients that no approved dApp uses and approved dApps whose client is missing, deleting nothing", async () => {
            const dapps = await seed();
            const unknownDapp = randomUUID() as DappId;
            const input = seedFields("removed");
            api.provisioner.clients.delete(dapps.approved.auth0ClientId as Auth0ClientId);
            api.provisioner.clients.set("fake_left-behind" as Auth0ClientId, { dappId: dapps.removed.id, input });
            api.provisioner.clients.set("fake_restored-away" as Auth0ClientId, { dappId: unknownDapp, input });
            api.provisioner.clients.set("fake_unrecorded" as Auth0ClientId, { dappId: dapps.pending.id, input });
            const clientsBefore = [...api.provisioner.clients];

            const report = await runReconcile(api.app);

            expect(report.orphanClients).toEqual([
                {
                    clientId: "fake_left-behind",
                    dappId: dapps.removed.id,
                    name: input.name,
                    callbacks: input.callbackUrls,
                    dappStatus: "removed",
                },
                { clientId: "fake_restored-away", dappId: unknownDapp, name: input.name, callbacks: input.callbackUrls, dappStatus: null },
                {
                    clientId: "fake_unrecorded",
                    dappId: dapps.pending.id,
                    name: input.name,
                    callbacks: input.callbackUrls,
                    dappStatus: "pending",
                },
            ]);
            expect(report.missingClients).toEqual([
                { id: dapps.approved.id, name: "Seed approved", status: "approved", auth0ClientId: dapps.approved.auth0ClientId },
            ]);
            expect([...api.provisioner.clients]).toEqual(clientsBefore);
            expect((await api.adminDapp(dapps.approved.id)).status).toBe("approved");
            expect((await api.adminDapp(dapps.pending.id)).status).toBe("pending");
        });
    });

    describe("anonymise", () => {
        it("erases the identities of a removed dApp and every email address in its events, keeps its business data and the rows", async () => {
            const dapps = await seed();
            const { id } = dapps.removed;
            await insertEmailFailure(id, `Email address is not verified: ${seedOwner("removed").email.toUpperCase()}`);
            const eventsBefore = await api.events(id);

            const result = await runAnonymise(api.dataSource, id);

            expect(result).toEqual({
                erasedColumns: ["ownerEmail", "contactEmail", "reviewedBy", "removedBy"],
                scrubbedColumns: [],
                events: eventsBefore.length,
                erasedActors: eventsBefore.filter((event) => event.actorEmail !== null).length,
                scrubbedDetails: 1,
            });
            const { contactEmail: _, ...businessData } = seedFields("removed");
            expect(await api.adminDapp(id)).toMatchObject({
                ...businessData,
                status: "removed",
                ownerEmail: "erased",
                contactEmail: "erased",
                reviewedBy: "erased",
                removedBy: "erased",
            });
            const eventsAfter = await api.events(id);
            expect(eventsAfter.map(({ id: eventId, type, actorEmail }) => ({ eventId, type, actorEmail }))).toEqual(
                eventsBefore.map(({ id: eventId, type, actorEmail }) => ({
                    eventId,
                    type,
                    actorEmail: actorEmail === null ? null : "erased",
                })),
            );
            const text = await rowsAsText(id);
            expect(text.dapp).not.toContain("@");
            expect(text.events).not.toContain("@");
            expect(text.events).toContain("Email address is not verified: erased");
        });

        it("is idempotent: a second run changes nothing", async () => {
            const { removed } = await seed();
            await runAnonymise(api.dataSource, removed.id);
            const before = await rowsAsText(removed.id);

            const result = await runAnonymise(api.dataSource, removed.id);

            expect(result).toMatchObject({ erasedColumns: [], scrubbedColumns: [], erasedActors: 0, scrubbedDetails: 0 });
            expect(await rowsAsText(removed.id)).toEqual(before);
        });

        it("erases on a rerun an address that reached the events after the first run", async () => {
            const { removed } = await seed();
            await runAnonymise(api.dataSource, removed.id);
            await insertEmailFailure(removed.id, `Email address is not verified: ${seedOwner("removed").email}`);

            const result = await runAnonymise(api.dataSource, removed.id);

            expect(result).toMatchObject({ scrubbedDetails: 1 });
            expect((await rowsAsText(removed.id)).events).not.toContain("@");
        });

        it("erases the address of an owner from the middle of an owner-change chain, who never acted", async () => {
            const first = await api.submitDapp(await api.user("first@owners.test"));
            const id = first.id as DappId;
            const middle = expectStatus<AdminDapp>(await api.changeOwner(id, first.version, "middle@owners.test"), 200);
            await insertEmailFailure(id, "Email address is not verified: middle@owners.test");
            const last = expectStatus<AdminDapp>(await api.changeOwner(id, middle.version, "last@owners.test"), 200);
            expectStatus(await api.adminRemove(id, last.version), 200);

            await runAnonymise(api.dataSource, id);

            const text = await rowsAsText(id);
            expect(text.dapp).not.toContain("@");
            expect(text.events).not.toContain("@");
            expect(text.events).toContain("Email address is not verified: erased");
        });

        it("erases an email address typed into the name or description", async () => {
            const owner = await api.user("alice@example.com");
            const form = dappForm({ name: "Pay alice@example.com", description: "Ask alice@example.com for access." });
            const dapp = await api.submitDapp(owner, form);
            expectStatus(await api.removeOwn(owner, dapp.id, dapp.version), 204);

            const result = await runAnonymise(api.dataSource, dapp.id as DappId);

            expect(result).toMatchObject({ scrubbedColumns: ["name", "description"] });
            expect(await api.adminDapp(dapp.id)).toMatchObject({ name: "Pay erased", description: "Ask erased for access." });
            expect((await rowsAsText(dapp.id)).dapp).not.toContain("@");
        });

        it("refuses a dApp that is not removed, or does not exist, and changes nothing", async () => {
            const dapps = await seed();
            const before = await rowsAsText(dapps.approved.id);

            await expect(runAnonymise(api.dataSource, dapps.approved.id)).rejects.toThrow(
                "is approved: only a removed dApp can be anonymised",
            );
            await expect(runAnonymise(api.dataSource, randomUUID() as DappId)).rejects.toThrow("not found");

            expect(await rowsAsText(dapps.approved.id)).toEqual(before);
        });
    });
});
