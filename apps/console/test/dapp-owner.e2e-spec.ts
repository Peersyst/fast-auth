import { directFieldsOf, syncedFieldsOf } from "../src/domain/dapp";
import { changesOf, dappForm, expectStatus, REASON, useConsoleApi } from "./utils/console-api";
import type { OwnerDapp } from "./utils/contract";
import { ADMIN_EMAILS } from "./utils/contract";

describe("owner API", () => {
    const api = useConsoleApi();

    describe("GET /dapp", () => {
        it("answers 200 with a null dApp when the caller has none", async () => {
            expect(await api.ownDapp(await api.user())).toBeNull();
        });

        it("finds the caller's dApp by email, whatever its case", async () => {
            const dapp = await api.submitDapp(await api.user("alice@acme-owner.test"));

            expect(await api.ownDapp(await api.user("ALICE@Acme-Owner.test"))).toEqual(dapp);
        });
    });

    describe("∅ → submit", () => {
        it("inserts a pending dApp, alerts the admins and logs `submitted`", async () => {
            const owner = await api.user();
            const start = await api.checkpoint();

            const dapp = expectStatus<OwnerDapp>(await api.submit(owner, dappForm()), 201);

            expect(dapp).toEqual({
                ...dappForm(),
                id: expect.any(String),
                status: "pending",
                rejectionReason: null,
                pendingChange: null,
                pendingChangeAt: null,
                auth0ClientId: null,
                version: expect.any(Number),
                submittedAt: expect.any(String),
            });
            expect(await api.ownDapp(owner)).toEqual(dapp);
            expect(await api.adminDapp(dapp.id)).toEqual({
                ...dapp,
                ownerEmail: owner.email,
                reviewedAt: null,
                reviewedBy: null,
                auth0Error: null,
                auth0SyncedAt: null,
                removedAt: null,
                removedBy: null,
                removalReason: null,
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            });
            const effects = await start.effects(dapp.id);
            expect(effects.events).toEqual([
                {
                    id: expect.any(String),
                    type: "submitted",
                    actorEmail: owner.email,
                    actorRole: "user",
                    details: { chosenForAutoApproval: false },
                    createdAt: expect.any(String),
                },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);
            expect(effects.emailEvents).toEqual([{ type: "email_sent", template: "admin_alert" }]);
            expect(effects.slack).toEqual(["submitted"]);
        });

        it("stores and returns the normalised values", async () => {
            const dapp = await api.submitDapp(await api.user(), {
                ...dappForm(),
                name: "  Acme Wallet ",
                description: " A wallet for the Acme community.  ",
                logoUrl: " HTTPS://ACME.XYZ/logo.png",
                callbackUrls: ["HTTPS://Acme.xyz/callback", "https://acme.xyz/callback "],
                logoutUrls: ["https://ACME.xyz/"],
                webOrigins: ["https://ACME.XYZ", "https://acme.xyz"],
                contactEmail: " team@acme.xyz ",
            });

            expect({ ...syncedFieldsOf(dapp), ...directFieldsOf(dapp) }).toEqual(dappForm());
        });
    });

    describe("∅ → submit, when a notification fails", () => {
        it("a failed admin alert still answers 201 to the submission", async () => {
            const owner = await api.user();
            const start = await api.checkpoint();
            api.emailer.send.mockRejectedValueOnce(new Error("SES is down"));

            const dapp = expectStatus<OwnerDapp>(await api.submit(owner, dappForm()), 201);

            const effects = await start.effects(dapp.id);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);
            expect(effects.emailEvents).toEqual([{ type: "email_failed", template: "admin_alert" }]);
            expect(await api.ownDapp(owner)).toEqual(dapp);
        });

        it("a failed Slack alert still answers 201 to the submission", async () => {
            const owner = await api.user();
            const start = await api.checkpoint();
            api.slack.notify.mockRejectedValueOnce(new Error("Slack is down"));

            const dapp = expectStatus<OwnerDapp>(await api.submit(owner, dappForm()), 201);

            const effects = await start.effects(dapp.id);
            expect(effects.slack).toEqual(["submitted"]);
            expect(effects.emailEvents).toEqual([{ type: "email_sent", template: "admin_alert" }]);
            expect(await api.ownDapp(owner)).toEqual(dapp);
        });
    });

    describe("pending → edit", () => {
        it("applies every field in place and logs `edited` with before and after, the contact email by name only", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);
            const form = dappForm({
                name: "Acme Pay",
                callbackUrls: ["https://acme.xyz/callback", "https://pay.acme.xyz/callback"],
                mauBracket: "10k_25k",
                contactEmail: "ops@acme.xyz",
            });

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, dapp.id, form, dapp.version), 200);

            expect(edited).toEqual({ ...dapp, ...form, version: expect.any(Number) });
            expect(edited.version).toBeGreaterThan(dapp.version);
            expect(await api.ownDapp(owner)).toEqual(edited);
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "edited", actorEmail: owner.email, actorRole: "user" }]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "callbackUrls", before: ["https://acme.xyz/callback"], after: form.callbackUrls },
                { field: "contactEmail" },
                { field: "mauBracket", before: "lt1k", after: "10k_25k" },
                { field: "name", before: "Acme Wallet", after: "Acme Pay" },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([]);
            expect(effects.emailEvents).toEqual([]);
        });
    });

    describe("rejected → edit", () => {
        it("resubmits: pending again, review cleared, submittedAt reset, admins alerted, `edited` then `resubmitted`", async () => {
            const owner = await api.user();
            const rejected = await api.rejectedDapp(owner);
            const checkpoint = await api.checkpoint(rejected.id);
            const form = dappForm({ logoUrl: "https://cdn.acme.xyz/logo.png" });

            const resubmitted = expectStatus<OwnerDapp>(await api.edit(owner, rejected.id, form, rejected.version), 200);

            expect(resubmitted).toMatchObject({ ...form, status: "pending", rejectionReason: null });
            const admin = await api.adminDapp(rejected.id);
            expect(admin).toMatchObject({ status: "pending", rejectionReason: null, reviewedAt: null, reviewedBy: null, auth0Error: null });
            expect(Date.parse(admin.submittedAt)).toBeGreaterThan(Date.parse(rejected.submittedAt));
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([
                { type: "edited", actorEmail: owner.email, actorRole: "user" },
                { type: "resubmitted", actorEmail: owner.email, actorRole: "user" },
            ]);
            expect(changesOf(effects.events[0])).toEqual([{ field: "logoUrl", before: dappForm().logoUrl, after: form.logoUrl }]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "resubmitted" }]);
            expect(effects.slack).toEqual(["resubmitted"]);
            expect(api.slack.notify.mock.lastCall?.[0]).toMatchObject({
                kind: "resubmitted",
                rejected: { logoUrl: dappForm().logoUrl },
                rejectionReason: REASON,
                dapp: { logoUrl: form.logoUrl, status: "pending" },
            });
        });
    });

    describe("approved → edit, direct fields only", () => {
        it("applies contact email and MAU bracket at once and logs `edited`, without Auth0 or email", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);
            const form = dappForm({ contactEmail: "ops@acme.xyz", mauBracket: "gt25k" });

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, approved.id, form, approved.version), 200);

            expect(edited).toMatchObject({
                ...form,
                status: "approved",
                pendingChange: null,
                pendingChangeAt: null,
                auth0ClientId: approved.auth0ClientId,
            });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "edited", actorEmail: owner.email, actorRole: "user" }]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "contactEmail" },
                { field: "mauBracket", before: "lt1k", after: "gt25k" },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([]);
        });
    });

    describe("approved → edit, synced fields changed", () => {
        it("queues the synced fields as a pending change, keeps the live values, alerts the admins, logs `change_requested`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);
            const form = dappForm({ name: "Acme Pay", webOrigins: ["https://acme.xyz", "https://pay.acme.xyz"] });

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, approved.id, form, approved.version), 200);

            expect(edited).toMatchObject({
                ...dappForm(),
                status: "approved",
                pendingChange: syncedFieldsOf(form),
                pendingChangeAt: expect.any(String),
            });
            expect(await api.adminDapp(approved.id)).toMatchObject({ name: "Acme Wallet", pendingChange: syncedFieldsOf(form) });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "change_requested", actorEmail: owner.email, actorRole: "user" }]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "name", before: "Acme Wallet", after: "Acme Pay" },
                { field: "webOrigins", before: ["https://acme.xyz"], after: form.webOrigins },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "change_requested" }]);
            expect(effects.slack).toEqual([]);
        });

        it("applies a direct field at once alongside the request, logging `change_requested` then `edited`", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);
            const form = dappForm({ description: "Pay with Acme.", mauBracket: "1k_10k" });

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, approved.id, form, approved.version), 200);

            expect(edited).toMatchObject({
                description: dappForm().description,
                mauBracket: "1k_10k",
                pendingChange: syncedFieldsOf(form),
            });
            const effects = await checkpoint.effects();
            expect(effects.events.map((event) => event.type)).toEqual(["change_requested", "edited"]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "description", before: dappForm().description, after: "Pay with Acme." },
            ]);
            expect(changesOf(effects.events[1])).toEqual([{ field: "mauBracket", before: "lt1k", after: "1k_10k" }]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "change_requested" }]);
        });

        it("keeps the pending change when the synced fields equal it, applying only the direct fields", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            const checkpoint = await api.checkpoint(approved.id);

            const edited = expectStatus<OwnerDapp>(
                await api.edit(owner, requested.id, dappForm({ name: "Acme Pay", contactEmail: "ops@acme.xyz" }), requested.version),
                200,
            );

            expect(edited).toMatchObject({
                name: "Acme Wallet",
                contactEmail: "ops@acme.xyz",
                pendingChange: requested.pendingChange,
                pendingChangeAt: requested.pendingChangeAt,
            });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "edited" }]);
            expect(changesOf(effects.events[0])).toEqual([{ field: "contactEmail" }]);
            expect(effects.emails).toEqual([]);
        });
    });

    describe("approved → edit, synced fields back to live", () => {
        it("withdraws the pending change and logs `change_withdrawn`, without Auth0 or email", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            const checkpoint = await api.checkpoint(approved.id);

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, requested.id, dappForm(), requested.version), 200);

            expect(edited).toMatchObject({ ...dappForm(), status: "approved", pendingChange: null, pendingChangeAt: null });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "change_withdrawn", actorEmail: owner.email, actorRole: "user" }]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([]);
        });
    });

    describe("approved → edit, a different change replaces the pending one", () => {
        it("replaces the pending change, logs `change_requested` from the live values and alerts the admins again", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            const checkpoint = await api.checkpoint(approved.id);
            const form = dappForm({ description: "Pay with Acme." });

            const edited = expectStatus<OwnerDapp>(await api.edit(owner, requested.id, form, requested.version), 200);

            expect(edited).toMatchObject({ ...dappForm(), pendingChange: syncedFieldsOf(form), pendingChangeAt: expect.any(String) });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "change_requested" }]);
            expect(changesOf(effects.events[0])).toEqual([
                { field: "description", before: dappForm().description, after: "Pay with Acme." },
            ]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "change_requested" }]);
        });
    });

    describe("any live → remove (owner)", () => {
        it("removes a pending dApp with 204 and no email, logging `removed` without a reason; with no client tagged with the dApp, nothing is deleted", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const checkpoint = await api.checkpoint(dapp.id);

            const response = await api.removeOwn(owner, dapp.id, dapp.version);

            expectStatus(response, 204);
            expect(response.text).toBe("");
            expect(await api.ownDapp(owner)).toBeNull();
            expect(await api.adminDapp(dapp.id)).toMatchObject({
                status: "removed",
                removedAt: expect.any(String),
                removedBy: owner.email,
                removalReason: null,
            });
            const effects = await checkpoint.effects();
            expect(effects.events).toMatchObject([{ type: "removed", actorEmail: owner.email, actorRole: "user" }]);
            expect(effects.events[0]?.details.reason).toBeUndefined();
            expect(effects.auth0).toEqual([{ op: "findClient", dappId: dapp.id }]);
            expect(effects.emails).toEqual([]);
            expect(effects.emailEvents).toEqual([]);
        });

        it("deletes the client of an approved dApp, logging `removed` then `auth0_deleted`, and emails nobody", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const checkpoint = await api.checkpoint(approved.id);

            expectStatus(await api.removeOwn(owner, approved.id, approved.version), 204);

            const effects = await checkpoint.effects();
            expect(effects.auth0).toEqual([{ op: "deleteClient", dappId: approved.id, clientId: approved.auth0ClientId }]);
            expect(api.provisioner.clients.size).toBe(0);
            expect(effects.events).toMatchObject([
                { type: "removed", actorRole: "user" },
                { type: "auth0_deleted", details: { clientId: approved.auth0ClientId } },
            ]);
            expect(effects.emails).toEqual([]);
        });

        it("clears the pending change of an approved dApp it removes", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            const requested = await api.requestChange(owner, approved, { name: "Acme Pay" });
            expect(requested.pendingChange).not.toBeNull();

            expectStatus(await api.removeOwn(owner, requested.id, requested.version), 204);

            expect(await api.adminDapp(approved.id)).toMatchObject({
                status: "removed",
                name: "Acme Wallet",
                pendingChange: null,
                pendingChangeAt: null,
            });
        });

        it("removes a rejected dApp", async () => {
            const owner = await api.user();
            const rejected = await api.rejectedDapp(owner);

            expectStatus(await api.removeOwn(owner, rejected.id, rejected.version), 204);

            expect(await api.ownDapp(owner)).toBeNull();
            expect(await api.adminDapp(rejected.id)).toMatchObject({ status: "removed", removedBy: owner.email });
        });

        it("lets the owner submit again, while admins still see the removed dApp", async () => {
            const owner = await api.user();
            const removed = await api.submitDapp(owner);
            expectStatus(await api.removeOwn(owner, removed.id, removed.version), 204);

            const again = await api.submitDapp(owner, dappForm({ name: "Acme Wallet 2" }));

            expect(again.id).not.toBe(removed.id);
            expect(await api.ownDapp(owner)).toEqual(again);
            expect(await api.adminDapp(removed.id)).toMatchObject({ status: "removed", name: "Acme Wallet" });
        });
    });
});
