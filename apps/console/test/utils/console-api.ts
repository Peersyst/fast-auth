import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import type { QueryRunner } from "typeorm";
import { DataSource } from "typeorm";
import type { ConsoleErrorCode } from "../../src/modules/common/exception/error-codes";
import type { ConsoleEmail, Emailer } from "../../src/modules/notifications/emailer";
import { EMAILER } from "../../src/modules/notifications/emailer";
import type { SlackAlertKind, SlackNotifier } from "../../src/modules/notifications/slack-notifier";
import { SLACK_NOTIFIER } from "../../src/modules/notifications/slack-notifier";
import type { AdminDapp, DappEvent, DappFormFields, ErrorBody, OwnerDapp } from "./contract";
import { ADMIN_EMAIL } from "./contract";
import { createTestApp, resetDatabase } from "./test-app";
import { signToken } from "./tokens";

export type Actor = { email: string; token: string };

type SentEmail = { template: string; to: string | string[]; kind?: string };

type Effects = {
    events: DappEvent[];
    emailEvents: { type: string; template: unknown }[];
    emails: SentEmail[];
    slack: SlackAlertKind[];
};

type Checkpoint = { effects(dappId?: string): Promise<Effects> };

export function dappForm(overrides: Partial<DappFormFields> = {}): DappFormFields {
    return {
        name: "Acme Wallet",
        description: "A wallet for the Acme community.",
        logoUrl: "https://acme.xyz/logo.png",
        mauBracket: "lt1k",
        callbackUrls: ["https://acme.xyz/callback"],
        logoutUrls: ["https://acme.xyz/"],
        webOrigins: ["https://acme.xyz"],
        contactEmail: "team@acme.xyz",
        ...overrides,
    };
}

export function changesOf(event: DappEvent | undefined): unknown[] {
    const changes = (event?.details.changes ?? []) as { field: string }[];
    return [...changes].sort((a, b) => a.field.localeCompare(b.field));
}

export function expectStatus<T>(response: request.Response, status: number): T {
    if (response.status !== status) throw new Error(`Expected ${status}, got ${response.status}: ${JSON.stringify(response.body)}`);
    return response.body;
}

export function expectError(response: request.Response, status: number, code: ConsoleErrorCode): ErrorBody {
    expect({ status: response.status, body: response.body }).toMatchObject({ status, body: { statusCode: status, code } });
    return response.body;
}

export function expectValidationFailed(response: request.Response, field?: string): void {
    const body = expectError(response, 400, "VALIDATION_FAILED");
    if (field !== undefined) expect(body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
}

function summarise(email: ConsoleEmail): SentEmail {
    return {
        template: email.template,
        to: email.to,
        ...("kind" in email && { kind: email.kind }),
    };
}

function byJson(a: unknown, b: unknown): number {
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

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

    get emailer(): jest.Mocked<Emailer> {
        return this.app.get(EMAILER);
    }

    get slack(): jest.Mocked<SlackNotifier> {
        return this.app.get(SLACK_NOTIFIER);
    }

    get dataSource(): DataSource {
        return this.app.get(DataSource);
    }

    async reset(): Promise<void> {
        await resetDatabase(this.app);
        this.emailer.send.mockReset();
        this.slack.notify.mockReset();
        this.admin = await this.user(ADMIN_EMAIL);
    }

    async user(email?: string, emailVerified = true): Promise<Actor> {
        this.actors += 1;
        const sub = `auth0|e2e-${this.actors}`;
        const address = email ?? `owner-${this.actors}@owners.test`;
        return { email: address, token: await signToken({ sub, email: address, emailVerified }) };
    }

    async send(method: "get" | "post" | "put" | "delete", path: string, actor: Actor, body?: object): Promise<request.Response> {
        const call = request(this.app.getHttpServer())[method](`/api/console${path}`).set("Authorization", `Bearer ${actor.token}`);
        return body === undefined ? call : call.send(body);
    }

    getDapp(owner: Actor): Promise<request.Response> {
        return this.send("get", "/dapp", owner);
    }

    submit(owner: Actor, form: DappFormFields): Promise<request.Response> {
        return this.send("post", "/dapp", owner, form);
    }

    edit(owner: Actor, id: string, form: DappFormFields, expectedVersion: number): Promise<request.Response> {
        return this.send("put", `/dapp/${id}`, owner, { ...form, expectedVersion });
    }

    removeOwn(owner: Actor, id: string, expectedVersion: number): Promise<request.Response> {
        return this.send("delete", `/dapp/${id}?expectedVersion=${expectedVersion}`, owner);
    }

    detail(id: string, admin = this.admin): Promise<request.Response> {
        return this.send("get", `/admin/dapps/${id}`, admin);
    }

    async submitDapp(owner: Actor, form = dappForm()): Promise<OwnerDapp> {
        return expectStatus<OwnerDapp>(await this.submit(owner, form), 201);
    }

    async ownDapp(owner: Actor): Promise<OwnerDapp | null> {
        return expectStatus<{ dapp: OwnerDapp | null }>(await this.getDapp(owner), 200).dapp;
    }

    async adminDapp(id: string): Promise<AdminDapp> {
        return expectStatus<AdminDapp>(await this.detail(id), 200);
    }

    async events(id: string): Promise<DappEvent[]> {
        return expectStatus<DappEvent[]>(await this.send("get", `/admin/dapps/${id}/events`, this.admin), 200);
    }

    async checkpoint(dappId?: string): Promise<Checkpoint> {
        const eventCount = dappId === undefined ? 0 : (await this.events(dappId)).length;
        const emailCount = this.emailer.send.mock.calls.length;
        const slackCount = this.slack.notify.mock.calls.length;
        return {
            effects: async (id = dappId): Promise<Effects> => {
                if (id === undefined) throw new Error("effects() needs the dApp id when the checkpoint was taken without one");
                const events = await this.events(id);
                const fresh = events.slice(0, events.length - eventCount).reverse();
                const isEmail = (event: DappEvent): boolean => event.type === "email_sent" || event.type === "email_failed";
                return {
                    events: fresh.filter((event) => !isEmail(event)),
                    emailEvents: fresh
                        .filter(isEmail)
                        .map((event) => ({ type: event.type, template: event.details.template }))
                        .sort(byJson),
                    emails: this.emailer.send.mock.calls
                        .slice(emailCount)
                        .map(([email]) => summarise(email))
                        .sort(byJson),
                    slack: this.slack.notify.mock.calls.slice(slackCount).map(([alert]) => alert.kind),
                };
            },
        };
    }

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
