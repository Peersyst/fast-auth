import { Logger } from "@nestjs/common";
import { AUTO_APPROVAL_DAILY_CAP as DAILY_CAP, syncedFieldsOf } from "../src/domain/dapp";
import { DappsRepository } from "../src/modules/dapps/repositories/dapps.repository";
import { dappForm, expectError, expectStatus, untilHeld, useConsoleApi } from "./utils/console-api";
import type { AdminDapp, OwnerDapp, Settings } from "./utils/contract";
import { ADMIN_EMAIL, ADMIN_EMAILS } from "./utils/contract";

const CAP_TEST_TIMEOUT_MS = 30_000;

describe("auto-approval and settings", () => {
    const api = useConsoleApi();

    const submitForNewOwner = async (): Promise<OwnerDapp> => api.submitDapp(await api.user());

    describe("settings", () => {
        it("records each change in setting_events: key, old and new value, admin", async () => {
            expect(expectStatus<Settings>(await api.putSettings({ autoApproval: { enabled: true } }), 200)).toEqual({
                autoApproval: { enabled: true },
            });
            expect(expectStatus<Settings>(await api.getSettings(), 200)).toEqual({ autoApproval: { enabled: true } });

            await api.setAutoApproval(false);

            expect(expectStatus<Settings>(await api.getSettings(), 200)).toEqual({ autoApproval: { enabled: false } });
            expect(await api.settingEvents()).toEqual([
                { key: "auto_approval", oldValue: { enabled: false }, newValue: { enabled: true }, actorEmail: ADMIN_EMAIL },
                { key: "auto_approval", oldValue: { enabled: true }, newValue: { enabled: false }, actorEmail: ADMIN_EMAIL },
            ]);
        });

        it("answers 200 with the stored value and records nothing for a PUT that changes nothing", async () => {
            expect(expectStatus<Settings>(await api.putSettings({ autoApproval: { enabled: false } }), 200)).toEqual({
                autoApproval: { enabled: false },
            });
            await api.setAutoApproval(true);
            expect(expectStatus<Settings>(await api.putSettings({ autoApproval: { enabled: true } }), 200)).toEqual({
                autoApproval: { enabled: true },
            });

            expect(await api.settingEvents()).toEqual([
                { key: "auto_approval", oldValue: { enabled: false }, newValue: { enabled: true }, actorEmail: ADMIN_EMAIL },
            ]);
        });

        it("a submission waiting on its owner's dApp leaves the settings row free for other submissions and admins", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            const hold = api.provisioner.hold("createClient");
            const approving = api.approve(dapp.id, dapp.version);
            await untilHeld(hold, approving);
            const resubmitting = api.submit(owner, dappForm());
            await api.lockWaitStarted();

            expect(expectStatus<OwnerDapp>(await api.submit(await api.user(), dappForm()), 201).status).toBe("pending");
            expectStatus(await api.putSettings({ autoApproval: { enabled: true } }), 200);

            hold.release();
            expectStatus(await approving, 200);
            expectError(await resubmitting, 409, "DAPP_ALREADY_EXISTS");
        });
    });

    describe("∅ → submit, auto-approval applies", () => {
        it("approves as the system: client created, owner and admins emailed, `submitted`, `auto_approved`, `auth0_created`", async () => {
            await api.setAutoApproval(true);
            const owner = await api.user();
            const start = await api.checkpoint();

            const dapp = expectStatus<OwnerDapp>(await api.submit(owner, dappForm()), 201);

            expect(dapp).toMatchObject({ ...dappForm(), status: "approved", auth0ClientId: expect.any(String) });
            expect(await api.adminDapp(dapp.id)).toMatchObject({
                status: "approved",
                reviewedAt: expect.any(String),
                reviewedBy: null,
                auth0SyncedAt: expect.any(String),
                auth0Error: null,
            });
            expect([...api.provisioner.clients]).toEqual([[dapp.auth0ClientId, { dappId: dapp.id, input: syncedFieldsOf(dappForm()) }]]);
            const effects = await start.effects(dapp.id);
            expect(effects.events).toMatchObject([
                { type: "submitted", actorEmail: owner.email, actorRole: "user", details: { chosenForAutoApproval: true } },
                { type: "auto_approved", actorEmail: null, actorRole: "system" },
                {
                    type: "auth0_created",
                    actorRole: "system",
                    details: { clientId: dapp.auth0ClientId, payload: syncedFieldsOf(dappForm()) },
                },
            ]);
            expect(effects.auth0.map((call) => call.op)).toEqual(["findClient", "createClient"]);
            expect(effects.emails).toEqual([
                { template: "admin_alert", to: ADMIN_EMAILS, kind: "auto_approved" },
                { template: "dapp_approved", to: owner.email },
            ]);
            expect(effects.emailEvents).toEqual([
                { type: "email_sent", template: "admin_alert" },
                { type: "email_sent", template: "dapp_approved" },
            ]);
            expect(effects.slack).toEqual(["auto_approved"]);
        });

        it(
            "approves at most 10 chosen submissions in 24 hours; the 11th waits as pending with the usual alert",
            async () => {
                await api.setAutoApproval(true);
                for (let n = 0; n < DAILY_CAP; n += 1) expect((await submitForNewOwner()).status).toBe("approved");
                const start = await api.checkpoint();

                const eleventh = await submitForNewOwner();

                expect(eleventh).toMatchObject({ status: "pending", auth0ClientId: null });
                const effects = await start.effects(eleventh.id);
                expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: false } }]);
                expect(effects.auth0).toEqual([]);
                expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);
                expect(api.provisioner.clients.size).toBe(DAILY_CAP);
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it(
            "counts only the choices of the last 24 hours",
            async () => {
                await api.setAutoApproval(true);
                for (let n = 0; n < DAILY_CAP; n += 1) expect((await submitForNewOwner()).status).toBe("approved");
                await api.dataSource.query(`UPDATE "dapp_events" SET "created_at" = "created_at" - interval '25 hours'`);

                expect((await submitForNewOwner()).status).toBe("approved");
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it(
            "still counts the choices of 23 hours ago, so the 11th submission waits as pending",
            async () => {
                await api.setAutoApproval(true);
                for (let n = 0; n < DAILY_CAP; n += 1) expect((await submitForNewOwner()).status).toBe("approved");
                await api.dataSource.query(`UPDATE "dapp_events" SET "created_at" = "created_at" - interval '23 hours'`);

                expect((await submitForNewOwner()).status).toBe("pending");
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it(
            "leaves the submission pending when the create fails, alerts the admins as a new submission, and still counts the choice",
            async () => {
                await api.setAutoApproval(true);
                const owner = await api.user();
                const start = await api.checkpoint();
                api.provisioner.script("createClient", "failed");
                const failed = expectStatus<OwnerDapp>(await api.submit(owner, dappForm()), 201);

                expect(failed).toMatchObject({ status: "pending", auth0ClientId: null });
                expect(await api.adminDapp(failed.id)).toMatchObject({
                    status: "pending",
                    reviewedAt: null,
                    auth0Error: expect.any(String),
                });
                const effects = await start.effects(failed.id);
                expect(effects.events).toMatchObject([
                    { type: "submitted", details: { chosenForAutoApproval: true } },
                    { type: "auth0_failed", details: { op: "create" } },
                ]);
                expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);

                for (let n = 1; n < DAILY_CAP; n += 1) expect((await submitForNewOwner()).status).toBe("approved");
                expect((await submitForNewOwner()).status).toBe("pending");
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it("a submission whose auto-approval fails outside Auth0 stays pending, answers 201 and alerts the admins", async () => {
            await api.setAutoApproval(true);
            jest.spyOn(api.provisioner, "findClient").mockRejectedValueOnce(new Error("connection reset"));
            jest.spyOn(Logger.prototype, "error").mockImplementation();
            const checkpoint = await api.checkpoint();

            const dapp = await submitForNewOwner();

            expect(dapp.status).toBe("pending");
            const effects = await checkpoint.effects(dapp.id);
            expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: true } }]);
            expect(effects.emails).toMatchObject([{ template: "admin_alert", kind: "submitted" }]);
        });

        it(
            "twelve concurrent submissions with auto-approval on approve exactly ten",
            async () => {
                await api.setAutoApproval(true);
                const owners = await Promise.all(Array.from({ length: DAILY_CAP + 2 }, () => api.user()));

                const responses = await Promise.all(owners.map((owner) => api.submit(owner, dappForm())));

                const statuses = responses.map((response) => expectStatus<OwnerDapp>(response, 201).status);
                expect(statuses.filter((status) => status === "approved")).toHaveLength(DAILY_CAP);
                expect(statuses.filter((status) => status === "pending")).toHaveLength(2);
                expect(api.provisioner.clients.size).toBe(DAILY_CAP);
                expect(api.provisioner.calls.filter((call) => call.op === "createClient")).toHaveLength(DAILY_CAP);
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it("turning it on does not approve the dApps already waiting", async () => {
            const waiting = await submitForNewOwner();

            await api.setAutoApproval(true);

            expect(await api.adminDapp(waiting.id)).toMatchObject({ status: "pending", auth0ClientId: null });
            expect(api.provisioner.calls).toEqual([]);
            expect((await submitForNewOwner()).status).toBe("approved");
            expect(await api.adminDapp(waiting.id)).toMatchObject({ status: "pending" });
        });

        it("sends a submission to review when its owner removed a dApp an admin had rejected", async () => {
            const owner = await api.user();
            const rejected = await api.rejectedDapp(owner);
            expectStatus(await api.removeOwn(owner, rejected.id, rejected.version), 204);
            await api.setAutoApproval(true);
            const start = await api.checkpoint();

            const again = await api.submitDapp(owner);

            expect(again).toMatchObject({ status: "pending", auth0ClientId: null });
            const effects = await start.effects(again.id);
            expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: false } }]);
            expect(effects.auth0).toEqual([]);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);
        });

        it("sends a submission to review when an admin removed its owner's earlier dApp", async () => {
            const owner = await api.user();
            const approved = await api.approvedDapp(owner);
            expectStatus(await api.adminRemove(approved.id, approved.version, "Phishing site impersonating a wallet"), 200);
            await api.setAutoApproval(true);
            const start = await api.checkpoint();

            const again = await api.submitDapp(owner);

            expect(again).toMatchObject({ status: "pending", auth0ClientId: null });
            const effects = await start.effects(again.id);
            expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: false } }]);
            expect(effects.auth0).toEqual([]);
        });

        it("sends a submission to review when an admin moved its owner's rejected dApp to another owner", async () => {
            const owner = await api.user();
            const rejected = await api.rejectedDapp(owner);
            expectStatus(await api.changeOwner(rejected.id, rejected.version, (await api.user()).email), 200);
            await api.setAutoApproval(true);
            const start = await api.checkpoint();

            const again = await api.submitDapp(owner);

            expect(again).toMatchObject({ status: "pending", auth0ClientId: null });
            const effects = await start.effects(again.id);
            expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: false } }]);
            expect(effects.auth0).toEqual([]);
        });

        it("sends a submission to review when its owner resubmitted a handed-over dApp that an admin then moved away", async () => {
            const owner = await api.user();
            const rejected = await api.rejectedDapp(await api.user());
            const handedOver = expectStatus<AdminDapp>(await api.changeOwner(rejected.id, rejected.version, owner.email), 200);
            const resubmitted = expectStatus<OwnerDapp>(
                await api.edit(owner, handedOver.id, dappForm({ name: "Acme Pay" }), handedOver.version),
                200,
            );
            expectStatus(await api.changeOwner(resubmitted.id, resubmitted.version, (await api.user()).email), 200);
            await api.setAutoApproval(true);

            const again = await api.submitDapp(owner);

            expect(again).toMatchObject({ status: "pending", auth0ClientId: null });
        });

        it(
            "approves one submission per owner, so an owner who removes and resubmits leaves the cap to others",
            async () => {
                await api.setAutoApproval(true);
                const owner = await api.user();
                const first = await api.submitDapp(owner);
                expect(first.status).toBe("approved");
                expectStatus(await api.removeOwn(owner, first.id, first.version), 204);
                const second = await api.submitDapp(owner);
                expect(second.status).toBe("pending");
                expectStatus(await api.removeOwn(owner, second.id, second.version), 204);
                expect((await api.submitDapp(owner)).status).toBe("pending");

                for (let n = 1; n < DAILY_CAP; n += 1) expect((await submitForNewOwner()).status).toBe("approved");
                expect((await submitForNewOwner()).status).toBe("pending");
            },
            CAP_TEST_TIMEOUT_MS,
        );

        it("turning it off before the approval reaches Auth0 leaves the chosen submission pending with no client", async () => {
            await api.setAutoApproval(true);
            const start = await api.checkpoint();
            const dapps = api.app.get(DappsRepository);
            const lockDapp = dapps.findByIdForUpdate.bind(dapps);
            let arrive = (): void => {};
            let release = (): void => {};
            const reached = new Promise<void>((resolve) => (arrive = resolve));
            const released = new Promise<void>((resolve) => (release = resolve));
            jest.spyOn(dapps, "findByIdForUpdate").mockImplementationOnce(async (manager, id) => {
                arrive();
                await released;
                return lockDapp(manager, id);
            });
            const submitting = api.submit(await api.user(), dappForm());
            await untilHeld({ reached, release }, submitting);

            await api.setAutoApproval(false);
            release();

            const dapp = expectStatus<OwnerDapp>(await submitting, 201);
            expect(dapp).toMatchObject({ status: "pending", auth0ClientId: null });
            expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "pending", reviewedAt: null, version: dapp.version });
            const effects = await start.effects(dapp.id);
            expect(effects.events).toMatchObject([{ type: "submitted", details: { chosenForAutoApproval: true } }]);
            expect(effects.auth0).toEqual([]);
            expect(api.provisioner.clients.size).toBe(0);
            expect(effects.emails).toEqual([{ template: "admin_alert", to: ADMIN_EMAILS, kind: "submitted" }]);
            expect(effects.slack).toEqual(["submitted"]);
        });

        it("turning it off again sends new submissions back to review", async () => {
            await api.setAutoApproval(true);
            await api.setAutoApproval(false);

            const dapp = await submitForNewOwner();

            expect(dapp.status).toBe("pending");
            expect(api.provisioner.calls).toEqual([]);
        });
    });
});
