import type request from "supertest";
import { AuthErrorCode } from "../../../src/modules/auth/error/auth-error-codes";
import { CommonErrorCode } from "../../../src/modules/common/exception/common-error-codes";
import { DappsErrorCode } from "../../../src/modules/dapps/error/dapps-error-codes";
import type { Actor } from "../../utils/console-api";
import { dappForm, expectError, expectStatus, expectValidationFailed, useConsoleApi } from "../../utils/console-api";
import { ADMIN_EMAIL } from "../../utils/contract";
import type { UpsertDappRequest } from "../../../src/modules/dapps/requests/upsert-dapp.request";
import type { MauBracket } from "@shared/console-domain/dapp";
import type { OwnerDappResponse } from "../../../src/modules/dapps/responses/owner-dapp.response";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("errors, guards and throttling", () => {
    const api = useConsoleApi();

    const dappCount = async (): Promise<number> => {
        const [row] = await api.dataSource.query<{ count: number }[]>('SELECT count(*)::int AS "count" FROM "dapps"');
        return row?.count ?? 0;
    };

    describe("guards", () => {
        it("should refuse an unverified user on /dapp with 403 EMAIL_NOT_VERIFIED", async () => {
            const unverified = await api.user(undefined, false);

            expectError(await api.getDapp(unverified), 403, AuthErrorCode.EMAIL_NOT_VERIFIED);
            expectError(await api.submit(unverified, dappForm()), 403, AuthErrorCode.EMAIL_NOT_VERIFIED);
        });

        it("should refuse an unverified token carrying an admin email on /admin with 403 EMAIL_NOT_VERIFIED", async () => {
            expectError(await api.detail(UNKNOWN_ID, await api.user(ADMIN_EMAIL, false)), 403, AuthErrorCode.EMAIL_NOT_VERIFIED);
        });

        it.each([`/admin/dapps/${UNKNOWN_ID}`])("should refuse a user token on %s with 403 FORBIDDEN_ROLE", async (path) => {
            expectError(await api.send("get", path, await api.user()), 403, AuthErrorCode.FORBIDDEN_ROLE);
        });
    });

    describe("not found", () => {
        it("should answer 404 DAPP_NOT_FOUND for PUT and DELETE /dapp/:id without a live dApp", async () => {
            const owner = await api.user();

            expectError(await api.edit(owner, UNKNOWN_ID, dappForm(), 1), 404, DappsErrorCode.DAPP_NOT_FOUND);
            expectError(await api.removeOwn(owner, UNKNOWN_ID, 1), 404, DappsErrorCode.DAPP_NOT_FOUND);
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown dApp id", async () => {
            expectError(await api.detail(UNKNOWN_ID), 404, DappsErrorCode.DAPP_NOT_FOUND);
        });

        it("should answer 400 VALIDATION_FAILED for a dApp id that is not a uuid", async () => {
            const owner = await api.user();

            expectValidationFailed(await api.detail("not-a-uuid"));
            expectValidationFailed(await api.edit(owner, "not-a-uuid", dappForm(), 1));
            expectValidationFailed(await api.removeOwn(owner, "not-a-uuid", 1));
        });
    });

    describe("conflicts", () => {
        it("should answer 409 DAPP_ALREADY_EXISTS for a second live dApp for one email, in any case", async () => {
            const owner = await api.user("bob@owners.test");
            await api.submitDapp(owner);

            expectError(await api.submit(owner, dappForm({ name: "Second" })), 409, DappsErrorCode.DAPP_ALREADY_EXISTS);
            expectError(await api.submit(await api.user("BOB@Owners.test"), dappForm()), 409, DappsErrorCode.DAPP_ALREADY_EXISTS);
            expect(await dappCount()).toBe(1);
        });

        it("should give one 201 and one 409 DAPP_ALREADY_EXISTS for two concurrent submissions for one email", async () => {
            const owner = await api.user();

            const responses = await Promise.all([api.submit(owner, dappForm()), api.submit(owner, dappForm({ name: "Acme Twin" }))]);

            expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
            const conflict = responses.find((response) => response.status === 409);
            expect(conflict?.body).toMatchObject({ statusCode: 409, code: "DAPP_ALREADY_EXISTS" });
            expect(await dappCount()).toBe(1);
        });

        it("should let a submit waiting on an uncommitted owner_email update to its email reach the unique index and answer 409 DAPP_ALREADY_EXISTS", async () => {
            const dapp = await api.submitDapp(await api.user());
            const newOwner = await api.user();
            await api.withOpenTransaction(async (runner) => {
                await runner.query("UPDATE dapps SET owner_email = $1 WHERE id = $2", [newOwner.email, dapp.id]);
                const submit = api.submit(newOwner, dappForm({ name: "Acme Twin" }));
                expect(await api.lockWaitStarted()).toHaveLength(1);
                await runner.commitTransaction();

                expectError(await submit, 409, DappsErrorCode.DAPP_ALREADY_EXISTS);
            });
            expect(await dappCount()).toBe(1);
            expect(await api.ownDapp(newOwner)).toMatchObject({ id: dapp.id });
        });

        it("should give one 200 and one 409 DAPP_CHANGED for two concurrent PUT /dapp/:id at one version", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);

            const responses = await api.withOpenTransaction(async (runner) => {
                await runner.query("SELECT 1 FROM dapps WHERE id = $1 FOR UPDATE", [dapp.id]);
                const edits = Promise.all([
                    api.edit(owner, dapp.id, dappForm({ name: "Acme Pay" }), dapp.version),
                    api.edit(owner, dapp.id, dappForm({ name: "Acme Cash" }), dapp.version),
                ]);
                expect(await api.lockWaitStarted(2)).toHaveLength(2);
                await runner.commitTransaction();
                return edits;
            });

            expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
            const conflict = responses.find((response) => response.status === 409);
            expect(conflict?.body).toMatchObject({ statusCode: 409, code: "DAPP_CHANGED" });
            expect(await api.ownDapp(owner)).toEqual(responses.find((response) => response.status === 200)?.body);
        });

        const staleWrites: [string, (owner: Actor, id: string, version: number) => Promise<request.Response>][] = [
            ["PUT /dapp/:id", (owner, id, version) => api.edit(owner, id, dappForm({ name: "Stale" }), version)],
            ["DELETE /dapp/:id", (owner, id, version) => api.removeOwn(owner, id, version)],
        ];

        it.each(staleWrites)("should answer 409 DAPP_CHANGED for a stale expectedVersion on %s and change nothing", async (_name, act) => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            expectStatus(await api.edit(owner, dapp.id, dappForm({ name: "Acme Pay" }), dapp.version), 200);
            const before = await api.adminDapp(dapp.id);

            expectError(await act(owner, dapp.id, dapp.version), 409, DappsErrorCode.DAPP_CHANGED);

            expect(await api.adminDapp(dapp.id)).toEqual(before);
        });

        it.each(staleWrites)(
            "should answer 409 DAPP_CHANGED for %s naming the owner's removed dApp and leave the new one unchanged",
            async (_name, act) => {
                const owner = await api.user();
                const removed = await api.submitDapp(owner, dappForm({ name: "Old App" }));
                expectStatus(await api.removeOwn(owner, removed.id, removed.version), 204);
                const fresh = await api.submitDapp(owner, dappForm({ name: "New App" }));
                expect(fresh.version).toBe(removed.version);
                const before = await api.adminDapp(fresh.id);

                expectError(await act(owner, removed.id, removed.version), 409, DappsErrorCode.DAPP_CHANGED);

                expect(await api.adminDapp(fresh.id)).toEqual(before);
            },
        );

        it.each(staleWrites)("should refuse %s naming another owner's dApp and leave it unchanged", async (_name, act) => {
            const dapp = await api.submitDapp(await api.user());
            const before = await api.adminDapp(dapp.id);
            const stranger = await api.user();

            expectError(await act(stranger, dapp.id, dapp.version), 404, DappsErrorCode.DAPP_NOT_FOUND);
            await api.submitDapp(stranger, dappForm({ name: "Stranger App" }));
            expectError(await act(stranger, dapp.id, dapp.version), 409, DappsErrorCode.DAPP_CHANGED);

            expect(await api.adminDapp(dapp.id)).toEqual(before);
        });
    });

    describe("validation", () => {
        it.each<[string, Partial<UpsertDappRequest>, string | undefined]>([
            ["an http callback URL", { callbackUrls: ["http://acme.xyz/callback"] }, "callbackUrls"],
            ["an IP-literal logout URL", { logoutUrls: ["https://127.0.0.1/"] }, "logoutUrls"],
            ["a web origin with a path", { webOrigins: ["https://acme.xyz/app"] }, "webOrigins"],
            ["an http logo URL", { logoUrl: "http://acme.xyz/logo.png" }, "logoUrl"],
            ["a name with angle brackets", { name: "<b>Acme</b>" }, "name"],
            ["a 141-character description", { description: "a".repeat(141) }, undefined],
            ["an invalid contact email", { contactEmail: "not-an-email" }, undefined],
            ["an unknown MAU bracket", { mauBracket: "huge" as MauBracket }, undefined],
        ])("should refuse %s on POST /dapp with 400 VALIDATION_FAILED", async (_name, overrides, field) => {
            expectValidationFailed(await api.submit(await api.user(), dappForm(overrides)), field);
            expect(await dappCount()).toBe(0);
        });

        it("should refuse an unknown body field with 400 VALIDATION_FAILED naming it", async () => {
            const owner = await api.user();

            expectValidationFailed(
                await api.send("post", "/dapp", owner, { ...dappForm(), ownerEmail: "someone@else.test" }),
                "ownerEmail",
            );
            expect(await api.ownDapp(owner)).toBeNull();
        });

        it("should refuse an update without expectedVersion, as a body field or as a query field", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);

            expectValidationFailed(await api.send("put", `/dapp/${dapp.id}`, owner, dappForm({ name: "No Version" })));
            expectValidationFailed(await api.send("delete", `/dapp/${dapp.id}`, owner));
            expectValidationFailed(await api.send("delete", `/dapp/${dapp.id}?expectedVersion=latest`, owner));
            expect(await api.ownDapp(owner)).toEqual(dapp);
        });

        describe("NUL characters are refused before they reach Postgres", () => {
            it.each(["name", "description"] as const)("should refuse a NUL character in the %s", async (field) => {
                const response = await api.submit(await api.user(), dappForm({ [field]: "Acme\u0000Wallet" }));

                expectValidationFailed(response, field);
            });
        });
    });

    describe("throttling", () => {
        it("should answer the 6th POST /dapp within a minute from one sub with 429 RATE_LIMITED, and only for that sub", async () => {
            const owner = await api.user();
            const statuses: number[] = [];
            for (let n = 0; n < 5; n += 1) statuses.push((await api.submit(owner, dappForm())).status);

            expect(statuses).toEqual([201, 409, 409, 409, 409]);
            expectError(await api.submit(owner, dappForm()), 429, CommonErrorCode.RATE_LIMITED);
            expectStatus<OwnerDappResponse>(await api.submit(await api.user(), dappForm()), 201);
        });
    });
});
