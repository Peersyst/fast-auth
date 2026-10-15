import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import type { QueryRunner } from "typeorm";
import { DataSource } from "typeorm";
import type { SyncedFields } from "@shared/console-domain/dapp";
import { directFieldsOf, MauBracket, syncedFieldsOf } from "@shared/console-domain/dapp";
import { CommonErrorCode } from "../../src/modules/common/exception/common-error-codes";
import type { ConsoleErrorCode } from "../../src/modules/common/exception/error-codes";
import type { ConsoleEmail, Emailer } from "../../src/modules/notifications/emailer";
import { EMAILER } from "../../src/modules/notifications/emailer";
import type { SlackAlertKind, SlackNotifier } from "../../src/modules/notifications/slack-notifier";
import { SLACK_NOTIFIER } from "../../src/modules/notifications/slack-notifier";
import { AUTH0_PROVISIONER } from "../../src/modules/provisioning/auth0-provisioner";
import type { FakeHold, FakeProvisioner, FakeProvisionerCall } from "../../src/modules/provisioning/fake.provisioner";
import type { DappEvent } from "./contract";
import { ADMIN_EMAIL } from "./contract";
import { createTestApp, resetDatabase } from "./test-app";
import { signToken } from "./tokens";
import type { AdminDappResponse } from "../../src/modules/admin/responses/admin-dapp.response";
import type { UpsertDappRequest } from "../../src/modules/dapps/requests/upsert-dapp.request";
import type { ErrorResponse } from "../../src/modules/common/responses/error.response";
import type { OwnerDappResponse } from "../../src/modules/dapps/responses/owner-dapp.response";

export type Actor = { email: string; token: string };

type SentEmail = { template: string; to: string | string[]; kind?: string; reason?: string };

type Effects = {
    events: DappEvent[];
    emailEvents: { type: string; template: unknown }[];
    auth0: FakeProvisionerCall[];
    emails: SentEmail[];
    slack: SlackAlertKind[];
};

type Checkpoint = { effects(dappId?: string): Promise<Effects> };

export const NO_EFFECTS: Effects = { events: [], emailEvents: [], auth0: [], emails: [], slack: [] };

export const REASON = "Please host the logo on your own domain.";

/**
 * Builds a valid dApp form.
 * @param overrides The fields to replace.
 * @returns The form.
 */
export function dappForm(overrides: Partial<UpsertDappRequest> = {}): UpsertDappRequest {
    return {
        name: "Acme Wallet",
        description: "A wallet for the Acme community.",
        logoUrl: "https://acme.xyz/logo.png",
        mauBracket: MauBracket.LT_1K,
        callbackUrls: ["https://acme.xyz/callback"],
        logoutUrls: ["https://acme.xyz/"],
        webOrigins: ["https://acme.xyz"],
        contactEmail: "team@acme.xyz",
        ...overrides,
    };
}

/**
 * Reads the field changes of an event, sorted by field so tests can compare them.
 * @param event The event.
 * @returns The changes, or an empty list.
 */
export function changesOf(event: DappEvent | undefined): unknown[] {
    const changes = (event?.details.changes ?? []) as { field: string }[];
    return [...changes].sort((a, b) => a.field.localeCompare(b.field));
}

/**
 * Throws with the response body when the status differs.
 * @param response The response.
 * @param status The expected status.
 * @returns The body.
 */
export function expectStatus<T>(response: request.Response, status: number): T {
    if (response.status !== status) throw new Error(`Expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
    return response.body;
}

/**
 * Asserts that the response is the error envelope for the given status and code.
 * @param response The response.
 * @param status The expected status.
 * @param code The expected error code.
 * @returns The body.
 */
export function expectError(response: request.Response, status: number, code: ConsoleErrorCode): ErrorResponse {
    expect({ status: response.status, body: response.body }).toMatchObject({ status, body: { statusCode: status, code } });
    return response.body;
}

/**
 * Asserts a 400 VALIDATION_FAILED and, when a field is given, a detail that names it.
 * @param response The response.
 * @param field The field a detail must name, if any.
 */
export function expectValidationFailed(response: request.Response, field?: string): void {
    const body = expectError(response, 400, CommonErrorCode.VALIDATION_FAILED);
    if (field !== undefined) expect(body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
}

export async function untilHeld(hold: FakeHold, call: Promise<request.Response>): Promise<void> {
    const early = await Promise.race([hold.reached.then(() => undefined), call]);
    if (early !== undefined) {
        throw new Error(`The request answered ${early.status} ${JSON.stringify(early.body)} before reaching the held Auth0 call`);
    }
}

/**
 * Reduces a sent email to the fields tests compare.
 * @param email The sent email.
 * @returns The summary.
 */
function summarise(email: ConsoleEmail): SentEmail {
    return {
        template: email.template,
        to: email.to,
        ...("kind" in email && { kind: email.kind }),
        ...("reason" in email && { reason: email.reason }),
    };
}

/**
 * Orders values by their JSON text, so lists compare regardless of send order.
 * @param a The first value.
 * @param b The second value.
 * @returns A negative, zero or positive number.
 */
function byJson(a: unknown, b: unknown): number {
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

/**
 * Starts one app for the describe block and resets the database, the mocks and the admin before each test.
 * @returns The API client.
 */
export function useConsoleApi(): ConsoleApi {
    const api = new ConsoleApi();
    beforeAll(async () => {
        api.app = await createTestApp();
    });
    beforeEach(() => api.reset());
    afterAll(() => api.app.close());
    return api;
}

export class ConsoleApi {
    app: NestExpressApplication;
    admin: Actor = { email: ADMIN_EMAIL, token: "" };
    private actors = 0;

    get provisioner(): FakeProvisioner {
        return this.app.get<FakeProvisioner>(AUTH0_PROVISIONER);
    }

    get emailer(): jest.Mocked<Emailer> {
        return this.app.get(EMAILER);
    }

    get slack(): jest.Mocked<SlackNotifier> {
        return this.app.get(SLACK_NOTIFIER);
    }

    get dataSource(): DataSource {
        return this.app.get(DataSource);
    }

    /**
     * Empties the database, resets the emailer and Slack mocks and signs in a fresh admin.
     */
    async reset(): Promise<void> {
        await resetDatabase(this.app);
        this.provisioner.reset();
        this.emailer.send.mockReset();
        this.slack.notify.mockReset();
        this.admin = await this.user(ADMIN_EMAIL);
    }

    /**
     * Signs a token for a new user.
     * @param email The email, or a unique one when omitted.
     * @param emailVerified Whether the token says the email is verified.
     * @returns The actor.
     */
    async user(email?: string, emailVerified = true): Promise<Actor> {
        this.actors += 1;
        const sub = `auth0|e2e-${this.actors}`;
        const address = email ?? `owner-${this.actors}@owners.test`;
        return { email: address, token: await signToken({ sub, email: address, emailVerified }) };
    }

    /**
     * Calls the console API with the actor's token.
     * @param method The HTTP method.
     * @param path The path under /api/console.
     * @param actor Whose token to send.
     * @param body The JSON body, if any.
     * @returns The response.
     */
    async send(method: "get" | "post" | "put" | "delete", path: string, actor: Actor, body?: object): Promise<request.Response> {
        const call = request(this.app.getHttpServer())[method](`/api/console${path}`).set("Authorization", `Bearer ${actor.token}`);
        return body === undefined ? call : call.send(body);
    }

    /**
     * Asks for the owner's own dApp through GET /dapp.
     * @param owner The owner.
     * @returns The response.
     */
    getDapp(owner: Actor): Promise<request.Response> {
        return this.send("get", "/dapp", owner);
    }

    /**
     * Submits a form through POST /dapp.
     * @param owner The owner.
     * @param form The form.
     * @returns The response.
     */
    submit(owner: Actor, form: UpsertDappRequest): Promise<request.Response> {
        return this.send("post", "/dapp", owner, form);
    }

    /**
     * Edits a dApp through PUT /dapp/:id.
     * @param owner The owner.
     * @param id The dApp id.
     * @param form The new form.
     * @param expectedVersion The version to send.
     * @returns The response.
     */
    edit(owner: Actor, id: string, form: UpsertDappRequest, expectedVersion: number): Promise<request.Response> {
        return this.send("put", `/dapp/${id}`, owner, { ...form, expectedVersion });
    }

    /**
     * Removes the owner's dApp through DELETE /dapp/:id.
     * @param owner The owner.
     * @param id The dApp id.
     * @param expectedVersion The version to send.
     * @returns The response.
     */
    removeOwn(owner: Actor, id: string, expectedVersion: number): Promise<request.Response> {
        return this.send("delete", `/dapp/${id}?expectedVersion=${expectedVersion}`, owner);
    }

    list(query: Record<string, string | number | boolean> = {}, admin = this.admin): Promise<request.Response> {
        const search = new URLSearchParams(Object.entries(query).map(([key, value]): [string, string] => [key, String(value)])).toString();
        return this.send("get", `/admin/dapps${search ? `?${search}` : ""}`, admin);
    }

    /**
     * Reads a dApp through the admin's GET /admin/dapps/:id.
     * @param id The dApp id.
     * @param admin The admin, by default the one reset signs in.
     * @returns The response.
     */
    detail(id: string, admin = this.admin): Promise<request.Response> {
        return this.send("get", `/admin/dapps/${id}`, admin);
    }

    adminEdit(id: string, form: UpsertDappRequest, expectedVersion: number): Promise<request.Response> {
        return this.send("put", `/admin/dapps/${id}`, this.admin, { ...form, expectedVersion });
    }

    approve(id: string, expectedVersion: number, admin = this.admin): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/approve`, admin, { expectedVersion });
    }

    reject(id: string, expectedVersion: number, reason = REASON, admin = this.admin): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/reject`, admin, { expectedVersion, reason });
    }

    approveChange(id: string, expectedVersion: number): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/change/approve`, this.admin, { expectedVersion });
    }

    rejectChange(id: string, expectedVersion: number, reason = REASON): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/change/reject`, this.admin, { expectedVersion, reason });
    }

    changeOwner(id: string, expectedVersion: number, ownerEmail: string): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/owner`, this.admin, { expectedVersion, ownerEmail });
    }

    adminRemove(id: string, expectedVersion: number, reason = REASON): Promise<request.Response> {
        return this.send("post", `/admin/dapps/${id}/remove`, this.admin, { expectedVersion, reason });
    }

    /**
     * Submits a form and expects 201.
     * @param owner The owner.
     * @param form The form, by default a valid one.
     * @returns The created dApp.
     */
    async submitDapp(owner: Actor, form = dappForm()): Promise<OwnerDappResponse> {
        return expectStatus<OwnerDappResponse>(await this.submit(owner, form), 201);
    }

    /**
     * Reads the owner's own dApp and expects 200.
     * @param owner The owner.
     * @returns The dApp, or null.
     */
    async ownDapp(owner: Actor): Promise<OwnerDappResponse | null> {
        return expectStatus<{ dapp: OwnerDappResponse | null }>(await this.getDapp(owner), 200).dapp;
    }

    /**
     * Reads the admin view of a dApp and expects 200.
     * @param id The dApp id.
     * @returns The admin view.
     */
    async adminDapp(id: string): Promise<AdminDappResponse> {
        return expectStatus<AdminDappResponse>(await this.detail(id), 200);
    }

    /**
     * Lists a dApp's events as the admin and expects 200.
     * @param id The dApp id.
     * @returns The events, newest first.
     */
    async events(id: string): Promise<DappEvent[]> {
        return expectStatus<DappEvent[]>(await this.send("get", `/admin/dapps/${id}/events`, this.admin), 200);
    }

    async approvedDapp(owner: Actor, form = dappForm()): Promise<AdminDappResponse> {
        const dapp = await this.submitDapp(owner, form);
        return expectStatus<AdminDappResponse>(await this.approve(dapp.id, dapp.version), 200);
    }

    async rejectedDapp(owner: Actor, form = dappForm()): Promise<AdminDappResponse> {
        const dapp = await this.submitDapp(owner, form);
        return expectStatus<AdminDappResponse>(await this.reject(dapp.id, dapp.version), 200);
    }

    async requestChange(
        owner: Actor,
        dapp: UpsertDappRequest & { id: string; version: number },
        change: Partial<SyncedFields>,
    ): Promise<OwnerDappResponse> {
        return expectStatus<OwnerDappResponse>(
            await this.edit(owner, dapp.id, { ...syncedFieldsOf(dapp), ...directFieldsOf(dapp), ...change }, dapp.version),
            200,
        );
    }

    /**
     * Records the current events, emails and Slack alerts, so effects() returns only what happens after.
     * @param dappId The dApp whose events to track. effects() needs it when it is omitted here.
     * @returns The checkpoint.
     */
    async checkpoint(dappId?: string): Promise<Checkpoint> {
        const eventCount = dappId === undefined ? 0 : (await this.events(dappId)).length;
        const auth0Count = this.provisioner.calls.length;
        const emailCount = this.emailer.send.mock.calls.length;
        const slackCount = this.slack.notify.mock.calls.length;
        return {
            effects: async (id = dappId): Promise<Effects> => {
                if (id === undefined) throw new Error("effects() needs the dApp id when the checkpoint was taken without one");
                const events = await this.events(id);
                const fresh = events.slice(0, events.length - eventCount).reverse();
                const isEmail = (event: DappEvent): boolean => event.type === "email_sent" || event.type === "email_failed";
                const auth0 = this.provisioner.calls.slice(auth0Count);
                return {
                    events: fresh.filter((event) => !isEmail(event)),
                    emailEvents: fresh
                        .filter(isEmail)
                        .map((event) => ({ type: event.type, template: event.details.template }))
                        .sort(byJson),
                    auth0,
                    emails: this.emailer.send.mock.calls
                        .slice(emailCount)
                        .map(([email]) => summarise(email))
                        .sort(byJson),
                    slack: this.slack.notify.mock.calls.slice(slackCount).map(([alert]) => alert.kind),
                };
            },
        };
    }

    /**
     * Runs fn in a transaction on its own connection and rolls back whatever fn leaves uncommitted.
     * @param fn The work, given the open query runner.
     * @returns What fn returns.
     */
    async withOpenTransaction<T>(fn: (runner: QueryRunner) => Promise<T>): Promise<T> {
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        try {
            await runner.startTransaction();
            return await fn(runner);
        } finally {
            if (runner.isTransactionActive) await runner.rollbackTransaction();
            await runner.release();
        }
    }

    /**
     * Polls until at least the given number of queries wait on a row lock, giving up after 300 tries 10 ms apart.
     * @param waiting The number of waiting queries.
     * @returns Their SQL.
     */
    async lockWaitStarted(waiting = 1): Promise<string[]> {
        for (let attempt = 0; attempt < 300; attempt += 1) {
            const rows: { query: string }[] = await this.dataSource.query(
                `SELECT "query" FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`,
            );
            if (rows.length >= waiting) return rows.map((row) => row.query);
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error(`Fewer than ${waiting} requests started waiting for a row lock`);
    }
}
