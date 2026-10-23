import type request from "supertest";
import { syncedFieldsOf } from "../src/domain/dapp";
import { changesOf, dappForm, expectError, expectStatus, NO_EFFECTS, REASON, useConsoleApi } from "./utils/console-api";
import type { AdminDapp, OwnerDapp } from "./utils/contract";
import { ADMIN_EMAIL } from "./utils/contract";

describe("admin API", () => {
    const api = useConsoleApi();

    describe("pending → approve", () => {
        it("creates the client, approves, emails the owner the client id and logs `approved` then `auth0_created`", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);

            const approved = expectStatus<AdminDapp>(await api.approve(dapp.id, dapp.version), 200);

            expect(approved).toMatchObject({
                ...dappForm(),
                id: dapp.id,
                status: "approved",
                ownerEmail: owner.email,
                reviewedAt: expect.any(String),
                reviewedBy: ADMIN_EMAIL,
                auth0ClientId: expect.any(String),
                auth0SyncedAt: expect.any(String),
                auth0Error: null,
            });
            expect(approved.version).toBeGreaterThan(dapp.version);
            const clientId = approved.auth0ClientId;
            expect([...api.provisioner.clients]).toEqual([[clientId, { dappId: dapp.id, input: syncedFieldsOf(dappForm()) }]]);
            expect(await api.ownDapp(owner)).toMatchObject({ status: "approved", auth0ClientId: clientId });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "createClient", dappId: dapp.id, input: syncedFieldsOf(dappForm()) },
            ]);
            expect(effects.events).toMatchObject([
                { type: "approved", actorEmail: ADMIN_EMAIL, actorRole: "admin" },
                { type: "auth0_created", details: { clientId, payload: syncedFieldsOf(dappForm()) } },
            ]);
            expect(effects.emails).toEqual([{ template: "dapp_approved", to: owner.email }]);
            expect(effects.emailEvents).toEqual([{ type: "email_sent", template: "dapp_approved" }]);
            expect(api.emailer.send).toHaveBeenCalledWith(
                expect.objectContaining({ template: "dapp_approved", dapp: expect.objectContaining({ auth0ClientId: clientId }) }),
            );
        });
    });

    describe("pending → reject", () => {
        it("rejects with the reason, emails it to the owner and logs `rejected`; with no client tagged with the dApp, nothing is deleted", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);

            const rejected = expectStatus<AdminDapp>(await api.reject(dapp.id, dapp.version, REASON), 200);

            expect(rejected).toMatchObject({
                status: "rejected",
                rejectionReason: REASON,
                reviewedAt: expect.any(String),
                reviewedBy: ADMIN_EMAIL,
                auth0ClientId: null,
            });
            expect(await api.ownDapp(owner)).toMatchObject({ status: "rejected", rejectionReason: REASON });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([
                { type: "rejected", actorEmail: ADMIN_EMAIL, actorRole: "admin", details: { reason: REASON } },
            ]);
            expect(effects.auth0).toEqual([{ op: "findClient", dappId: dapp.id }]);
            expect(effects.emails).toEqual([{ template: "dapp_rejected", to: owner.email, reason: REASON }]);
        });

        it("counts the reason in UTF-16 code units, as the SPA does", async () => {
            const dapp = await api.submitDapp(await api.user());
            const reason = "No logo 👎";

            const rejected = expectStatus<AdminDapp>(await api.reject(dapp.id, dapp.version, reason), 200);

            expect(rejected).toMatchObject({ status: "rejected", rejectionReason: reason });
        });
    });

    describe("approved → approveChange", () => {
        it("applies the change, updates the client, emails the owner, logs `change_approved` then `auth0_updated`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay", logoUrl: "https://cdn.acme.xyz/logo.png" });
            const change = syncedFieldsOf(dappForm({ name: "Acme Pay", logoUrl: "https://cdn.acme.xyz/logo.png" }));
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.approveChange(approved.id, requested.version), 200);

            expect(result).toMatchObject({
                ...change,
                status: "approved",
                pendingChange: null,
                pendingChangeAt: null,
                auth0ClientId: approved.auth0ClientId,
                auth0Error: null,
            });
            expect(Date.parse(result.auth0SyncedAt ?? "")).toBeGreaterThan(Date.parse(approved.auth0SyncedAt ?? ""));
            expect([...api.provisioner.clients]).toEqual([[approved.auth0ClientId, { dappId: approved.id, input: change }]]);
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([{ op: "updateClient", dappId: approved.id, clientId: approved.auth0ClientId, input: change }]);
            expect(effects.events).toMatchObject([
                { type: "change_approved", actorEmail: ADMIN_EMAIL, actorRole: "admin" },
                { type: "auth0_updated", details: { clientId: approved.auth0ClientId, payload: change } },
            ]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "logoUrl", before: dappForm().logoUrl, after: change.logoUrl },
                { field: "name", before: "Acme Wallet", after: "Acme Pay" },
            ]);
            expect(effects.emails).toEqual([{ template: "change_approved", to: owner.email }]);
        });
    });

    describe("approved → rejectChange", () => {
        it("discards the change, puts the live fields back in Auth0, emails the reason to the owner and logs `change_rejected`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.rejectChange(approved.id, requested.version, REASON), 200);

            expect(result).toMatchObject({ ...dappForm(), status: "approved", pendingChange: null, pendingChangeAt: null });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([
                { type: "change_rejected", actorEmail: ADMIN_EMAIL, actorRole: "admin", details: { reason: REASON } },
                { type: "auth0_updated", details: { clientId: approved.auth0ClientId, payload: syncedFieldsOf(dappForm()) } },
            ]);
            expect(effects.auth0).toEqual([
                { op: "updateClient", dappId: approved.id, clientId: approved.auth0ClientId, input: syncedFieldsOf(dappForm()) },
            ]);
            expect(effects.emails).toEqual([{ template: "change_rejected", to: owner.email, reason: REASON }]);
        });
    });

    describe("change review preconditions", () => {
        it.each<[string, (id: string, version: number) => Promise<request.Response>]>([
            ["approve", (id, version) => api.approveChange(id, version)],
            ["reject", (id, version) => api.rejectChange(id, version)],
        ])("%s a change of an approved dApp without one is 409 NO_PENDING_CHANGE", async (_name, review) => {
            const approved = await api.approvedDapp(await api.user());

            expectError(await review(approved.id, approved.version), 409, "NO_PENDING_CHANGE");
        });

        it("reviewing a change of a pending dApp is 409 INVALID_TRANSITION", async () => {
            const dapp = await api.submitDapp(await api.user());

            expectError(await api.approveChange(dapp.id, dapp.version), 409, "INVALID_TRANSITION");
        });
    });

    describe("any live → adminEdit", () => {
        it("edits a pending dApp in place without Auth0, emails the owner, logs `edited` by the admin", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);
            const form = dappForm({ name: "Acme Pay", contactEmail: "ops@acme.xyz" });

            const result = expectStatus<AdminDapp>(await api.adminEdit(dapp.id, form, dapp.version), 200);

            expect(result).toMatchObject({ ...form, status: "pending", ownerEmail: owner.email });
            expect(await api.ownDapp(owner)).toMatchObject(form);
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "edited", actorEmail: ADMIN_EMAIL, actorRole: "admin" }]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "contactEmail" },
                { field: "name", before: "Acme Wallet", after: "Acme Pay" },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "changed_by_admin", to: owner.email }]);
        });

        it("applies synced fields of an approved dApp at once and updates the client: `edited` then `auth0_updated`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);
            const form = dappForm({ callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/callback2"] });

            const result = expectStatus<AdminDapp>(await api.adminEdit(approved.id, form, approved.version), 200);

            expect(result).toMatchObject({ ...form, status: "approved", pendingChange: null, auth0Error: null });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([
                { op: "updateClient", dappId: approved.id, clientId: approved.auth0ClientId, input: syncedFieldsOf(form) },
            ]);
            expect(effects.events).toMatchObject([
                { type: "edited", actorEmail: ADMIN_EMAIL, actorRole: "admin" },
                { type: "auth0_updated", details: { clientId: approved.auth0ClientId, payload: syncedFieldsOf(form) } },
            ]);
            expect(effects.emails).toEqual([{ template: "changed_by_admin", to: owner.email }]);
        });

        it("does not call Auth0 when only direct fields of an approved dApp change", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(
                await api.adminEdit(approved.id, dappForm({ mauBracket: "gt25k" }), approved.version),
                200,
            );

            expect(result).toMatchObject({ status: "approved", mauBracket: "gt25k" });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([]);
            expect(effects.events).toMatchObject([{ type: "edited", actorRole: "admin" }]);
            expect(effects.emails).toEqual([{ template: "changed_by_admin", to: owner.email }]);
        });

        it("saving the dApp's own values writes no event, sends no email and makes no Auth0 call", async () => {
            const approved = await api.approvedDapp(await api.user());
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.adminEdit(approved.id, dappForm(), approved.version), 200);

            expect(result).toMatchObject({ ...dappForm(), status: "approved", auth0ClientId: approved.auth0ClientId });
            expect(await checkpoint.effects()).toEqual(NO_EFFECTS);
        });

        it("keeps a rejected dApp rejected", async () => {
            const rejected = await api.rejectedDapp(await api.user());

            const result = expectStatus<AdminDapp>(await api.adminEdit(rejected.id, dappForm({ name: "Acme Pay" }), rejected.version), 200);

            expect(result).toMatchObject({ name: "Acme Pay", status: "rejected", rejectionReason: REASON });
        });

        it("refuses an approved dApp with a pending change with 409 INVALID_TRANSITION", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });

            expectError(await api.adminEdit(approved.id, dappForm({ name: "Acme Admin" }), requested.version), 409, "INVALID_TRANSITION");
            expect(api.provisioner.calls.filter((call) => call.op === "updateClient")).toEqual([]);
        });
    });

    describe("any live → changeOwner", () => {
        it("moves the dApp to the new owner, keeping status and client, logging `owner_changed` without Auth0 or email", async () => {
            const owner = await api.user();
            const newOwner = await api.user();
            const approved = await api.approvedDapp(owner);
            const before = await api.ownDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.changeOwner(approved.id, approved.version, newOwner.email), 200);

            expect(result).toMatchObject({ ownerEmail: newOwner.email, status: "approved", auth0ClientId: approved.auth0ClientId });
            expect(await api.ownDapp(owner)).toBeNull();
            expect(await api.ownDapp(newOwner)).toEqual({ ...before, version: result.version });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "owner_changed", actorEmail: ADMIN_EMAIL, actorRole: "admin" }]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([]);
        });

        it("lets the new owner edit the dApp, and the old one no longer can", async () => {
            const owner = await api.user();
            const newOwner = await api.user();
            const dapp = await api.submitDapp(owner);
            const moved = expectStatus<AdminDapp>(await api.changeOwner(dapp.id, dapp.version, newOwner.email), 200);

            expectError(await api.edit(owner, moved.id, dappForm({ name: "Old Owner" }), moved.version), 404, "DAPP_NOT_FOUND");
            const edited = expectStatus<OwnerDapp>(await api.edit(newOwner, moved.id, dappForm({ name: "New Owner" }), moved.version), 200);

            expect(edited).toMatchObject({ id: dapp.id, name: "New Owner" });
        });

        it("refuses a new owner who already has a live dApp with 409 DAPP_ALREADY_EXISTS", async () => {
            const busyOwner = await api.user();
            await api.submitDapp(busyOwner);
            const dapp = await api.submitDapp(await api.user());

            expectError(await api.changeOwner(dapp.id, dapp.version, busyOwner.email), 409, "DAPP_ALREADY_EXISTS");
        });
    });

    describe("any live → remove (admin)", () => {
        it("removes with a reason, deletes the client, emails the owner, logs `removed` then `auth0_deleted`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);

            const result = expectStatus<AdminDapp>(await api.adminRemove(approved.id, approved.version, REASON), 200);

            expect(result).toMatchObject({
                status: "removed",
                removedAt: expect.any(String),
                removedBy: ADMIN_EMAIL,
                removalReason: REASON,
            });
            expect(await api.ownDapp(owner)).toBeNull();
            expect(await api.adminDapp(approved.id)).toMatchObject({ status: "removed", removalReason: REASON });
            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([{ op: "deleteClient", dappId: approved.id, clientId: approved.auth0ClientId }]);
            expect(api.provisioner.clients.size).toBe(0);
            expect(effects.events).toMatchObject([
                { type: "removed", actorEmail: ADMIN_EMAIL, actorRole: "admin", details: { reason: REASON } },
                { type: "auth0_deleted", details: { clientId: approved.auth0ClientId } },
            ]);
            expect(effects.emails).toEqual([{ template: "removed_by_admin", to: owner.email, reason: REASON }]);
            expect(await api.submitDapp(owner, dappForm({ name: "Acme Wallet 2" }))).toMatchObject({ status: "pending" });
        });

        it("clears the error of an earlier failed approval that left no client", async () => {
            const dapp = await api.submitDapp(await api.user());
            api.provisioner.script("createClient", "rejected");
            expectError(await api.approve(dapp.id, dapp.version), 422, "PROVISIONING_REJECTED");
            expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "pending", auth0Error: expect.any(String) });

            const result = expectStatus<AdminDapp>(await api.adminRemove(dapp.id, dapp.version, REASON), 200);

            expect(result).toMatchObject({ status: "removed", auth0Error: null });
        });
    });

    it("approving a removed dApp is 409 INVALID_TRANSITION and changes nothing", async () => {
        const owner = await api.user();
        const dapp = await api.submitDapp(owner);
        expectStatus(await api.removeOwn(owner, dapp.id, dapp.version), 204);
        const removed = await api.adminDapp(dapp.id);

        expectError(await api.approve(removed.id, removed.version), 409, "INVALID_TRANSITION");
        expect(await api.adminDapp(dapp.id)).toEqual(removed);
    });

    describe("GET /admin/dapps/:id/events", () => {
        it("serves the activity log newest first, each event in the contract's shape", async () => {
            const approved = await api.approvedDapp(await api.user());

            const events = await api.events(approved.id);

            expect(events.map((event) => event.type)).toEqual(["email_sent", "auth0_created", "approved", "email_sent", "submitted"]);
            expect(events.map((event) => event.details.template)).toEqual([
                "dapp_approved",
                undefined,
                undefined,
                "admin_alert",
                undefined,
            ]);
            for (const event of events) {
                expect(Object.keys(event).sort()).toEqual(["actorEmail", "actorRole", "createdAt", "details", "id", "type"]);
            }
        });
    });
});
