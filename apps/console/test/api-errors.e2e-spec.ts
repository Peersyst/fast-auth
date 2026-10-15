import type request from "supertest";
import type { Actor } from "./utils/console-api";
import { dappForm, expectError, expectStatus, expectValidationFailed, useConsoleApi } from "./utils/console-api";
import type { DappFormFields, MauBracket, OwnerDapp } from "./utils/contract";
import { ADMIN_EMAIL } from "./utils/contract";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("errors, guards and throttling", () => {
    const api = useConsoleApi();

    const dappCount = async (): Promise<number> => {
        const [row] = await api.dataSource.query<{ count: number }[]>('SELECT count(*)::int AS "count" FROM "dapps"');
        return row?.count ?? 0;
    };

    describe("guards", () => {
        it("refuses an unverified user on /dapp with 403 EMAIL_NOT_VERIFIED", async () => {
            const unverified = await api.user(undefined, false);

            expectError(await api.getDapp(unverified), 403, "EMAIL_NOT_VERIFIED");
            expectError(await api.submit(unverified, dappForm()), 403, "EMAIL_NOT_VERIFIED");
        });

        it("refuses an unverified token carrying an admin email on /admin with 403 EMAIL_NOT_VERIFIED", async () => {
            expectError(await api.detail(UNKNOWN_ID, await api.user(ADMIN_EMAIL, false)), 403, "EMAIL_NOT_VERIFIED");
        });

        it.each([`/admin/dapps/${UNKNOWN_ID}`])("refuses a user token on %s with 403 FORBIDDEN_ROLE", async (path) => {
            expectError(await api.send("get", path, await api.user()), 403, "FORBIDDEN_ROLE");
        });
    });

    describe("not found", () => {
        it("PUT and DELETE /dapp/:id without a live dApp are 404 DAPP_NOT_FOUND", async () => {
            const owner = await api.user();

            expectError(await api.edit(owner, UNKNOWN_ID, dappForm(), 1), 404, "DAPP_NOT_FOUND");
            expectError(await api.removeOwn(owner, UNKNOWN_ID, 1), 404, "DAPP_NOT_FOUND");
        });

        it("an unknown dApp id is 404 DAPP_NOT_FOUND", async () => {
            expectError(await api.detail(UNKNOWN_ID), 404, "DAPP_NOT_FOUND");
        });

        it("a dApp id that is not a uuid is 400 VALIDATION_FAILED", async () => {
            const owner = await api.user();

            expectValidationFailed(await api.detail("not-a-uuid"));
            expectValidationFailed(await api.edit(owner, "not-a-uuid", dappForm(), 1));
            expectValidationFailed(await api.removeOwn(owner, "not-a-uuid", 1));
        });
    });

    describe("conflicts", () => {
        it("a second live dApp for one email, in any case, is 409 DAPP_ALREADY_EXISTS", async () => {
            const owner = await api.user("bob@owners.test");
            await api.submitDapp(owner);

            expectError(await api.submit(owner, dappForm({ name: "Second" })), 409, "DAPP_ALREADY_EXISTS");
            expectError(await api.submit(await api.user("BOB@Owners.test"), dappForm()), 409, "DAPP_ALREADY_EXISTS");
            expect(await dappCount()).toBe(1);
        });

        it("two concurrent submissions for one email give one 201 and one 409 DAPP_ALREADY_EXISTS", async () => {
            const owner = await api.user();

            const responses = await Promise.all([api.submit(owner, dappForm()), api.submit(owner, dappForm({ name: "Acme Twin" }))]);

            expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
            const conflict = responses.find((response) => response.status === 409);
            expect(conflict?.body).toMatchObject({ statusCode: 409, code: "DAPP_ALREADY_EXISTS" });
            expect(await dappCount()).toBe(1);
        });

        it("a submit waiting on an uncommitted owner_email update to its email reaches the unique index and answers 409 DAPP_ALREADY_EXISTS", async () => {
            const dapp = await api.submitDapp(await api.user());
            const newOwner = await api.user();
            await api.withOpenTransaction(async (runner) => {
                await runner.query("UPDATE dapps SET owner_email = $1 WHERE id = $2", [newOwner.email, dapp.id]);
                const submit = api.submit(newOwner, dappForm({ name: "Acme Twin" }));
                expect(await api.lockWaitStarted()).toHaveLength(1);
                await runner.commitTransaction();

                expectError(await submit, 409, "DAPP_ALREADY_EXISTS");
            });
            expect(await dappCount()).toBe(1);
            expect(await api.ownDapp(newOwner)).toMatchObject({ id: dapp.id });
        });

        it("two concurrent PUT /dapp/:id at one version give one 200 and one 409 DAPP_CHANGED", async () => {
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

        it.each(staleWrites)("a stale expectedVersion on %s is 409 DAPP_CHANGED and changes nothing", async (_name, act) => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);
            expectStatus(await api.edit(owner, dapp.id, dappForm({ name: "Acme Pay" }), dapp.version), 200);
            const before = await api.adminDapp(dapp.id);

            expectError(await act(owner, dapp.id, dapp.version), 409, "DAPP_CHANGED");

            expect(await api.adminDapp(dapp.id)).toEqual(before);
        });

        it.each(staleWrites)(
            "%s naming the owner's removed dApp is 409 DAPP_CHANGED and leaves the new one unchanged",
            async (_name, act) => {
                const owner = await api.user();
                const removed = await api.submitDapp(owner, dappForm({ name: "Old App" }));
                expectStatus(await api.removeOwn(owner, removed.id, removed.version), 204);
                const fresh = await api.submitDapp(owner, dappForm({ name: "New App" }));
                expect(fresh.version).toBe(removed.version);
                const before = await api.adminDapp(fresh.id);

                expectError(await act(owner, removed.id, removed.version), 409, "DAPP_CHANGED");

                expect(await api.adminDapp(fresh.id)).toEqual(before);
            },
        );

        it.each(staleWrites)("%s naming another owner's dApp is refused and leaves it unchanged", async (_name, act) => {
            const dapp = await api.submitDapp(await api.user());
            const before = await api.adminDapp(dapp.id);
            const stranger = await api.user();

            expectError(await act(stranger, dapp.id, dapp.version), 404, "DAPP_NOT_FOUND");
            await api.submitDapp(stranger, dappForm({ name: "Stranger App" }));
            expectError(await act(stranger, dapp.id, dapp.version), 409, "DAPP_CHANGED");

            expect(await api.adminDapp(dapp.id)).toEqual(before);
        });
    });

    describe("validation", () => {
        it.each<[string, Partial<DappFormFields>, string | undefined]>([
            ["an http callback URL", { callbackUrls: ["http://acme.xyz/callback"] }, "callbackUrls"],
            ["an IP-literal logout URL", { logoutUrls: ["https://127.0.0.1/"] }, "logoutUrls"],
            ["a web origin with a path", { webOrigins: ["https://acme.xyz/app"] }, "webOrigins"],
            ["an http logo URL", { logoUrl: "http://acme.xyz/logo.png" }, "logoUrl"],
            ["a name with angle brackets", { name: "<b>Acme</b>" }, "name"],
            ["a 141-character description", { description: "a".repeat(141) }, undefined],
            ["an invalid contact email", { contactEmail: "not-an-email" }, undefined],
            ["an unknown MAU bracket", { mauBracket: "huge" as MauBracket }, undefined],
        ])("POST /dapp refuses %s with 400 VALIDATION_FAILED", async (_name, overrides, field) => {
            expectValidationFailed(await api.submit(await api.user(), dappForm(overrides)), field);
            expect(await dappCount()).toBe(0);
        });

        it("refuses an unknown body field with 400 VALIDATION_FAILED naming it", async () => {
            const owner = await api.user();

            expectValidationFailed(
                await api.send("post", "/dapp", owner, { ...dappForm(), ownerEmail: "someone@else.test" }),
                "ownerEmail",
            );
            expect(await api.ownDapp(owner)).toBeNull();
        });

        it("refuses an update without expectedVersion, as a body field or as a query field", async () => {
            const owner = await api.user();
            const dapp = await api.submitDapp(owner);

            expectValidationFailed(await api.send("put", `/dapp/${dapp.id}`, owner, dappForm({ name: "No Version" })));
            expectValidationFailed(await api.send("delete", `/dapp/${dapp.id}`, owner));
            expectValidationFailed(await api.send("delete", `/dapp/${dapp.id}?expectedVersion=latest`, owner));
            expect(await api.ownDapp(owner)).toEqual(dapp);
        });

        describe("NUL characters are refused before they reach Postgres", () => {
            it.each(["name", "description"] as const)("in the %s", async (field) => {
                const response = await api.submit(await api.user(), dappForm({ [field]: "Acme\u0000Wallet" }));

                expectValidationFailed(response, field);
            });
        });
    });

    describe("throttling", () => {
        it("answers the 6th POST /dapp within a minute from one sub with 429 RATE_LIMITED, and only for that sub", async () => {
            const owner = await api.user();
            const statuses: number[] = [];
            for (let n = 0; n < 5; n += 1) statuses.push((await api.submit(owner, dappForm())).status);

            expect(statuses).toEqual([201, 409, 409, 409, 409]);
            expectError(await api.submit(owner, dappForm()), 429, "RATE_LIMITED");
            expectStatus<OwnerDapp>(await api.submit(await api.user(), dappForm()), 201);
        });
    });
});
