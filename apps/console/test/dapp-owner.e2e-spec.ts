import { syncedFieldsOf } from "../src/domain/dapp";
import { changesOf, dappForm, expectStatus, useConsoleApi } from "./utils/console-api";
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

            expect({ ...syncedFieldsOf(dapp), mauBracket: dapp.mauBracket, contactEmail: dapp.contactEmail }).toEqual(dappForm());
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
            expect(effects.emails).toEqual([]);
            expect(effects.emailEvents).toEqual([]);
        });
    });

    describe("any live → remove (owner)", () => {
        it("removes a pending dApp with 204 and no email, logging `removed` without a reason", async () => {
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
            expect(effects.emails).toEqual([]);
            expect(effects.emailEvents).toEqual([]);
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
