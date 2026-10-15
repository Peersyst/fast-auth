import { Logger } from "@nestjs/common";
import { syncedFieldsOf } from "../src/domain/dapp";
import { DappsRepository } from "../src/modules/dapps/repositories/dapps.repository";
import { dappForm, expectError, expectStatus, REASON, untilHeld, useConsoleApi } from "./utils/console-api";
import type { AdminDapp, OwnerDapp } from "./utils/contract";
import { ADMIN_EMAIL } from "./utils/contract";

const CREATE_FAILURES = [
    ["rejected", 422, "PROVISIONING_REJECTED"],
    ["failed", 502, "PROVISIONING_FAILED"],
] as const;

describe("Auth0 failures, concurrency and email failures", () => {
    const api = useConsoleApi();

    describe("approve", () => {
        it.each(CREATE_FAILURES)(
            "a scripted %s create answers %i %s, keeps the dApp as it was, and a retry with the same version approves",
            async (outcome, status, code) => {
                const owner = await api.user();
                const dapp = await api.submitDapp(owner);
                const before = await api.adminDapp(dapp.id);
                const checkpoint = await api.checkpoint(dapp.id);
                api.provisioner.script("createClient", outcome);

                expectError(await api.approve(dapp.id, dapp.version), status, code);

                expect(await api.adminDapp(dapp.id)).toEqual({ ...before, auth0Error: expect.any(String), updatedAt: expect.any(String) });
                expect(api.provisioner.clients.size).toBe(0);
                const effects = await checkpoint.effects();
                expect(effects.events).toMatchObject([{ type: "auth0_failed", details: { op: "create", error: expect.any(String) } }]);
                expect(effects.emails).toEqual([]);

                const approved = expectStatus<AdminDapp>(await api.approve(dapp.id, dapp.version), 200);
                expect(approved).toMatchObject({ status: "approved", auth0ClientId: expect.any(String), auth0Error: null });
            },
        );

        it("logs a 422 as refused and a 502 as failed", async () => {
            const log = jest.spyOn(Logger.prototype, "log");
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);

            api.provisioner.script("createClient", "rejected");
            expectError(await api.approve(dapp.id, dapp.version), 422, "PROVISIONING_REJECTED");
            api.provisioner.script("createClient", "failed");
            expectError(await api.approve(dapp.id, dapp.version), 502, "PROVISIONING_FAILED");

            expect(log).toHaveBeenCalledWith(`approve dApp ${dapp.id} by admin refused: PROVISIONING_REJECTED`);
            expect(log).toHaveBeenCalledWith(`approve dApp ${dapp.id} by admin failed: PROVISIONING_FAILED`);
        });

        it("a retry after a create that timed out after success adopts that client instead of creating a second", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            api.provisioner.script("createClient", "timeout_after_success");
            expectError(await api.approve(dapp.id, dapp.version), 502, "PROVISIONING_FAILED");
            const [orphan] = [...api.provisioner.clients.keys()];
            expect(api.provisioner.clients.size).toBe(1);
            expect(await api.adminDapp(dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                auth0Error: expect.any(String),
                version: dapp.version,
            });
            const checkpoint = await api.checkpoint(dapp.id);

            const approved = expectStatus<AdminDapp>(await api.approve(dapp.id, dapp.version), 200);

            expect(approved).toMatchObject({ status: "approved", auth0ClientId: orphan, auth0Error: null });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "updateClient", dappId: dapp.id, clientId: orphan, input: syncedFieldsOf(dappForm()) },
            ]);
            expect(effects.events).toMatchObject([
                { type: "approved", actorRole: "admin" },
                { type: "auth0_updated", details: { clientId: orphan, payload: syncedFieldsOf(dappForm()) } },
            ]);
            expect(api.provisioner.calls.filter((call) => call.op === "createClient")).toHaveLength(1);
            expect(effects.emails).toEqual([{ template: "dapp_approved", to: owner.email }]);
        });
    });

    describe("change approval and admin edit", () => {
        it("a tag_mismatch update answers 422 PROVISIONING_REJECTED, keeps the change pending, and a retry applies it", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            const before = await api.adminDapp(approved.id);
            const checkpoint = await api.checkpoint(approved.id);
            api.provisioner.script("updateClient", "tag_mismatch");

            expectError(await api.approveChange(approved.id, requested.version), 422, "PROVISIONING_REJECTED");

            expect(await api.adminDapp(approved.id)).toEqual({ ...before, auth0Error: expect.any(String), updatedAt: expect.any(String) });
            expect([...api.provisioner.clients]).toEqual([
                [approved.auth0ClientId, { dappId: approved.id, input: syncedFieldsOf(dappForm()) }],
            ]);
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "auth0_failed", details: { op: "update", clientId: approved.auth0ClientId } }]);
            expect(effects.emails).toEqual([]);

            const result = expectStatus<AdminDapp>(await api.approveChange(approved.id, requested.version), 200);
            expect(result).toMatchObject({ name: "Acme Pay", pendingChange: null, auth0Error: null });
        });

        it("rejecting a change whose update timed out after success puts the live fields back in Auth0", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            api.provisioner.script("updateClient", "timeout_after_success");
            expectError(await api.approveChange(approved.id, requested.version), 502, "PROVISIONING_FAILED");
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.rejectChange(approved.id, requested.version), 200);

            expect([...api.provisioner.clients]).toEqual([
                [approved.auth0ClientId, { dappId: approved.id, input: syncedFieldsOf(dappForm()) }],
            ]);
            expect(result).toMatchObject({ name: approved.name, pendingChange: null, auth0Error: null });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([
                { type: "change_rejected", actorRole: "admin" },
                { type: "auth0_updated", details: { clientId: approved.auth0ClientId, payload: syncedFieldsOf(dappForm()) } },
            ]);
        });

        it("rejecting a change whose approval failed after the update for a reason other than Auth0 puts the live fields back in Auth0", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            jest.spyOn(api.app.get(DappsRepository), "update").mockRejectedValueOnce(new Error("connection terminated"));
            expectError(await api.approveChange(approved.id, requested.version), 500, "INTERNAL");
            expect([...api.provisioner.clients]).toEqual([
                [approved.auth0ClientId, { dappId: approved.id, input: syncedFieldsOf(dappForm({ name: "Acme Pay" })) }],
            ]);
            expect(await api.adminDapp(approved.id)).toMatchObject({ name: approved.name, auth0Error: null });

            expectStatus<AdminDapp>(await api.rejectChange(approved.id, requested.version), 200);

            expect([...api.provisioner.clients]).toEqual([
                [approved.auth0ClientId, { dappId: approved.id, input: syncedFieldsOf(dappForm()) }],
            ]);
        });

        it("a failed update on an admin edit of an approved dApp leaves its fields as they were", async () => {
            const approved = await api.approvedDapp(await api.user());
            const before = await api.adminDapp(approved.id);
            api.provisioner.script("updateClient", "failed");

            expectError(await api.adminEdit(approved.id, dappForm({ name: "Acme Pay" }), approved.version), 502, "PROVISIONING_FAILED");

            expect(await api.adminDapp(approved.id)).toEqual({ ...before, auth0Error: expect.any(String), updatedAt: expect.any(String) });
            expect(api.emailer.send.mock.calls.map(([email]) => email.template)).not.toContain("changed_by_admin");
        });

        it("an admin saving the live fields unchanged after a withdrawn change's update timed out after success puts them back in Auth0", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            api.provisioner.script("updateClient", "timeout_after_success");
            expectError(await api.approveChange(approved.id, requested.version), 502, "PROVISIONING_FAILED");
            const withdrawn = expectStatus<OwnerDapp>(await api.edit(owner, approved.id, dappForm(), requested.version), 200);
            expect(withdrawn.pendingChange).toBeNull();
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.adminEdit(approved.id, dappForm(), withdrawn.version), 200);

            expect([...api.provisioner.clients]).toEqual([
                [approved.auth0ClientId, { dappId: approved.id, input: syncedFieldsOf(dappForm()) }],
            ]);
            expect(result).toMatchObject({ name: approved.name, auth0Error: null });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([
                { type: "auth0_updated", details: { clientId: approved.auth0ClientId, payload: syncedFieldsOf(dappForm()) } },
            ]);
            expect(effects.emails).toEqual([]);
        });
    });

    describe("remove", () => {
        it("a failed delete keeps the dApp and its client; a retry with the same version removes it", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const before = await api.adminDapp(approved.id);
            const checkpoint = await api.checkpoint(approved.id);
            api.provisioner.script("deleteClient", "failed");

            expectError(await api.removeOwn(owner, approved.id, approved.version), 502, "PROVISIONING_FAILED");

            expect(await api.adminDapp(approved.id)).toEqual({ ...before, auth0Error: expect.any(String), updatedAt: expect.any(String) });
            expect(await api.ownDapp(owner)).toMatchObject({ status: "approved" });
            expect(api.provisioner.clients.size).toBe(1);
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "auth0_failed", details: { op: "delete", clientId: approved.auth0ClientId } }]);

            expectStatus(await api.removeOwn(owner, approved.id, approved.version), 204);
            expect(api.provisioner.clients.size).toBe(0);
        });

        it("a client with other tags is left in place: the dApp is still removed and `auth0_failed` records the client id", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);
            api.provisioner.script("deleteClient", "tag_mismatch");

            expectStatus(await api.removeOwn(owner, approved.id, approved.version), 204);

            expect(await api.adminDapp(approved.id)).toMatchObject({ status: "removed", auth0Error: expect.any(String) });
            expect([...api.provisioner.clients.keys()]).toEqual([approved.auth0ClientId]);
            const effects = await checkpoint.effects();
            expect(effects.events.map((event) => event.type).sort()).toEqual(["auth0_failed", "removed"]);
            expect(effects.events.find((event) => event.type === "auth0_failed")?.details).toMatchObject({
                op: "delete",
                clientId: approved.auth0ClientId,
            });
        });
    });

    describe("cleanup of a client the dApp row does not record", () => {
        const pendingWithOrphan = async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            api.provisioner.script("createClient", "timeout_after_success");
            expectError(await api.approve(dapp.id, dapp.version), 502, "PROVISIONING_FAILED");
            const [orphan] = [...api.provisioner.clients.keys()];
            return { owner, dapp, orphan };
        };

        it("reject deletes the client tagged with the dApp, logging `rejected` then `auth0_deleted`", async () => {
            const { dapp, orphan } = await pendingWithOrphan();
            const checkpoint = await api.checkpoint(dapp.id);

            const rejected = expectStatus<AdminDapp>(await api.reject(dapp.id, dapp.version), 200);

            expect(rejected).toMatchObject({ status: "rejected", auth0ClientId: null, auth0Error: null });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "deleteClient", dappId: dapp.id, clientId: orphan },
            ]);
            expect(api.provisioner.clients.size).toBe(0);
            expect(effects.events).toMatchObject([{ type: "rejected" }, { type: "auth0_deleted", details: { clientId: orphan } }]);
        });

        it("reject deletes a client left by an approve that failed after the create for a reason other than Auth0", async () => {
            const dapp = await api.submitDapp(await api.user());
            jest.spyOn(api.app.get(DappsRepository), "update").mockRejectedValueOnce(new Error("connection terminated"));
            expectError(await api.approve(dapp.id, dapp.version), 500, "INTERNAL");
            const [orphan] = [...api.provisioner.clients.keys()];
            const checkpoint = await api.checkpoint(dapp.id);

            expectStatus<AdminDapp>(await api.reject(dapp.id, dapp.version), 200);

            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "deleteClient", dappId: dapp.id, clientId: orphan },
            ]);
            expect(api.provisioner.clients.size).toBe(0);
        });

        it("an owner's removal of the pending dApp deletes it too, logging `removed` then `auth0_deleted`", async () => {
            const { owner, dapp, orphan } = await pendingWithOrphan();
            const checkpoint = await api.checkpoint(dapp.id);

            expectStatus(await api.removeOwn(owner, dapp.id, dapp.version), 204);

            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "deleteClient", dappId: dapp.id, clientId: orphan },
            ]);
            expect(effects.events).toMatchObject([{ type: "removed" }, { type: "auth0_deleted", details: { clientId: orphan } }]);
        });

        it("a failed removal of a rejected dApp sets auth0Error, and editing it (a resubmission) clears it", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            api.provisioner.script("createClient", "rejected");
            expectError(await api.approve(dapp.id, dapp.version), 422, "PROVISIONING_REJECTED");
            const rejected = expectStatus<AdminDapp>(await api.reject(dapp.id, dapp.version), 200);
            expect(rejected.auth0Error).toBeNull();
            api.provisioner.script("findClient", "failed");

            expectError(await api.removeOwn(owner, rejected.id, rejected.version), 502, "PROVISIONING_FAILED");
            expect(await api.adminDapp(dapp.id)).toMatchObject({
                status: "rejected",
                auth0Error: expect.any(String),
                version: rejected.version,
            });

            const resubmitted = expectStatus<OwnerDapp>(
                await api.edit(owner, rejected.id, dappForm({ name: "Acme Pay" }), rejected.version),
                200,
            );
            expect(resubmitted.status).toBe("pending");
            expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "pending", auth0Error: null });
        });
    });

    describe("concurrency", () => {
        it("two admins approving at once create one client: the second waits for the row lock and gets 409 DAPP_CHANGED", async () => {
            const dapp = await api.submitDapp(await api.user());
            const otherAdmin = await api.user(ADMIN_EMAIL);
            const hold = api.provisioner.hold("createClient");
            const first = api.approve(dapp.id, dapp.version);
            await untilHeld(hold, first);
            const second = api.approve(dapp.id, dapp.version, otherAdmin);
            try {
                await Promise.race([api.lockWaitStarted(), second]);
            } finally {
                hold.release();
            }

            expectStatus(await first, 200);
            expectError(await second, 409, "DAPP_CHANGED");
            const types = (await api.events(dapp.id)).map((event) => event.type);
            expect(types.filter((type) => type === "auth0_created")).toHaveLength(1);
            expect(types.filter((type) => type === "approved")).toHaveLength(1);
            expect(api.provisioner.calls.filter((call) => call.op === "createClient")).toHaveLength(1);
            expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "approved", reviewedBy: ADMIN_EMAIL });
        });

        describe("an Auth0 failure is recorded before the row lock is released", () => {
            it("a reject waiting on an approve whose create timed out after success sees the failure and deletes the client", async () => {
                const dapp = await api.submitDapp(await api.user());
                const otherAdmin = await api.user(ADMIN_EMAIL);
                const hold = api.provisioner.hold("findClient");
                api.provisioner.script("createClient", "timeout_after_success");

                const approve = api.approve(dapp.id, dapp.version);
                await untilHeld(hold, approve);
                const reject = api.reject(dapp.id, dapp.version, REASON, otherAdmin);
                try {
                    await api.lockWaitStarted();
                } finally {
                    hold.release();
                }

                expectError(await approve, 502, "PROVISIONING_FAILED");
                expect(expectStatus<AdminDapp>(await reject, 200)).toMatchObject({ status: "rejected", auth0Error: null });
                expect(api.provisioner.clients.size).toBe(0);
                const events = (await api.events(dapp.id)).filter((event) => !event.type.startsWith("email_")).reverse();
                expect(events.map((event) => event.type)).toEqual(["submitted", "auth0_failed", "rejected", "auth0_deleted"]);
            });

            it("an approve waiting on a failed approve ends approved without a stale auth0Error", async () => {
                const dapp = await api.submitDapp(await api.user());
                const otherAdmin = await api.user(ADMIN_EMAIL);
                const holdFind = api.provisioner.hold("findClient");
                api.provisioner.script("createClient", "rejected");

                const first = api.approve(dapp.id, dapp.version);
                await untilHeld(holdFind, first);
                const second = api.approve(dapp.id, dapp.version, otherAdmin);
                const holdCreate = api.provisioner.hold("createClient");
                try {
                    await api.lockWaitStarted();
                    holdFind.release();
                    await untilHeld(holdCreate, second);
                } finally {
                    holdFind.release();
                    holdCreate.release();
                }

                expectError(await first, 422, "PROVISIONING_REJECTED");
                expect(expectStatus<AdminDapp>(await second, 200)).toMatchObject({ status: "approved", auth0Error: null });
                expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "approved", auth0Error: null });
                const events = (await api.events(dapp.id)).filter((event) => !event.type.startsWith("email_")).reverse();
                expect(events.map((event) => event.type)).toEqual(["submitted", "auth0_failed", "approved", "auth0_created"]);
            });
        });
    });

    describe("email failures", () => {
        it("a failed owner email still approves and keeps the provider's message in `email_failed`, not in the logs", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);
            const message = `Email address is not verified: ${owner.email}`;
            api.emailer.send.mockRejectedValueOnce(Object.assign(new Error(message), { name: "MessageRejected" }));
            const warn = jest.spyOn(Logger.prototype, "warn");

            const approved = expectStatus<AdminDapp>(await api.approve(dapp.id, dapp.version), 200);

            expect(approved.status).toBe("approved");
            expect((await checkpoint.effects()).emailEvents).toEqual([{ type: "email_failed", template: "dapp_approved" }]);
            const [latest] = await api.events(dapp.id);
            expect(latest).toMatchObject({ type: "email_failed", details: { template: "dapp_approved", error: message } });
            expect(JSON.stringify(warn.mock.calls)).not.toContain(owner.email);
        });
    });
});
