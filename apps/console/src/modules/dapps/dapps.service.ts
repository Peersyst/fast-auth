import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../../config/console-config";
import { CONSOLE_CONFIG } from "../../config/console-config";
import type { Dapp, DappFields, DappId, DappStatus } from "../../domain/dapp";
import { DAPP_FIELDS } from "../../domain/dapp";
import { diffFields } from "../../domain/dapp-edits";
import type { DappEventDetails } from "../../domain/dapp-event";
import type { DappAction } from "../../domain/dapp-transitions";
import { transition } from "../../domain/dapp-transitions";
import type { SessionUser } from "../auth/session-user";
import { ConsoleException } from "../common/exception/console.exception";
import { postgresErrorCode } from "../common/exception/console-exception.filter";
import type { ConsoleErrorCode } from "../common/exception/error-codes";
import { ERROR_CODES } from "../common/exception/error-codes";
import type { AdminAlertKind, ConsoleEmail, Emailer } from "../notifications/emailer";
import { EMAILER } from "../notifications/emailer";
import type { SlackAlert, SlackNotifier } from "../notifications/slack-notifier";
import { SLACK_NOTIFIER } from "../notifications/slack-notifier";
import type { TransitionAction } from "./dapps.metrics";
import { DappsMetrics } from "./dapps.metrics";
import type { Actor, StoredDappEvent } from "./repositories/dapp-events.repository";
import { DappEventsRepository } from "./repositories/dapp-events.repository";
import { DappsRepository } from "./repositories/dapps.repository";

const SYSTEM: Actor = { email: null, role: "system" };

type Apply<T> = (manager: EntityManager, dapp: Dapp, next: DappStatus) => Promise<T>;

function consoleCode(error: unknown): ConsoleErrorCode | undefined {
    return error instanceof ConsoleException ? error.code : postgresErrorCode(error);
}

function describeError(error: unknown): string {
    const consoleErrorCode = consoleCode(error);
    if (consoleErrorCode !== undefined) return consoleErrorCode;
    if (!(error instanceof Error)) return typeof error;
    const code = "code" in error ? error.code : undefined;
    return typeof code === "string" ? `${error.name} (${code})` : error.name;
}

const refusedOrFailed = (error: unknown): string => {
    const code = consoleCode(error);
    return code !== undefined && ERROR_CODES[code].status < 500 ? "refused" : "failed";
};

const ownerActor = (user: SessionUser): Actor => ({ email: user.email, role: "user" });

@Injectable()
export class DappsService {
    private readonly logger = new Logger(DappsService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly dapps: DappsRepository,
        private readonly events: DappEventsRepository,
        private readonly metrics: DappsMetrics,
        @Inject(EMAILER) private readonly emailer: Emailer,
        @Inject(SLACK_NOTIFIER) private readonly slack: SlackNotifier,
        @Inject(CONSOLE_CONFIG) private readonly config: ConsoleConfig,
    ) {}

    findOwn(user: SessionUser): Promise<Dapp | null> {
        return this.dapps.findLiveByOwner(user.email);
    }

    async get(id: DappId): Promise<Dapp> {
        const dapp = await this.dapps.findById(id);
        if (dapp === null) throw new ConsoleException("DAPP_NOT_FOUND");
        return dapp;
    }

    async listEvents(id: DappId): Promise<StoredDappEvent[]> {
        await this.get(id);
        return this.events.listForDapp(id);
    }

    submit(user: SessionUser, fields: DappFields): Promise<Dapp> {
        return this.counted("submit", async () => {
            const submission = this.dataSource.transaction(async (manager) => {
                if ((await this.dapps.findLiveByOwnerForUpdate(manager, user.email)) !== null)
                    throw new ConsoleException("DAPP_ALREADY_EXISTS");
                const dapp = await this.dapps.insert(manager, {
                    ...fields,
                    ownerEmail: user.email,
                    submittedAt: new Date(),
                });
                await this.events.append(manager, dapp.id, ownerActor(user), {
                    type: "submitted",
                    details: { chosenForAutoApproval: false },
                });
                return dapp;
            });
            const dapp = await submission.catch((error: unknown) => {
                this.logger.log(`submit by user ${refusedOrFailed(error)}: ${describeError(error)}`);
                throw error;
            });
            this.logger.log(`submit dApp ${dapp.id} by user: -> pending`);
            await this.sendEmails([this.adminAlert(dapp, "submitted")]);
            await this.notifySlack({ kind: "submitted", dapp });
            return dapp;
        });
    }

    editOwn(user: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted("edit", () => {
            const owner = ownerActor(user);
            return this.mutate("edit", owner, user.email, id, expectedVersion, async (manager, live, next) => {
                const changes = diffFields(DAPP_FIELDS, live, fields);
                const dapp = await this.dapps.update(manager, live.id, { ...fields, status: next });
                await this.appendEvents(manager, live.id, owner, changes.length > 0 ? [{ type: "edited", details: { changes } }] : []);
                return dapp;
            });
        });
    }

    removeOwn(user: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted("remove", () => {
            const owner = ownerActor(user);
            return this.mutate("remove", owner, user.email, id, expectedVersion, async (manager, live, next) => {
                const dapp = await this.dapps.update(manager, live.id, { status: next, removedAt: new Date(), removedBy: owner.email });
                await this.appendEvents(manager, live.id, owner, [{ type: "removed", details: {} }]);
                return dapp;
            });
        });
    }

    private async mutate<T>(
        action: DappAction,
        actor: Actor,
        ownerEmail: string,
        id: DappId,
        expectedVersion: number,
        apply: Apply<T>,
    ): Promise<T> {
        let dappId: DappId | null = null;
        try {
            return await this.dataSource.transaction(async (manager) => {
                const dapp = await this.dapps.findLiveByOwnerForUpdate(manager, ownerEmail);
                if (dapp === null) throw new ConsoleException("DAPP_NOT_FOUND");
                dappId = dapp.id;
                if (dapp.id !== id || dapp.version !== expectedVersion) throw new ConsoleException("DAPP_CHANGED");
                const result = transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action);
                if (!result.ok) throw new ConsoleException(result.code);
                const value = await apply(manager, dapp, result.next);
                this.logger.log(`${action} dApp ${dapp.id} by ${actor.role}: ${dapp.status} -> ${result.next}`);
                return value;
            });
        } catch (error) {
            this.logger.log(`${action} dApp ${dappId ?? "(none)"} by ${actor.role} ${refusedOrFailed(error)}: ${describeError(error)}`);
            throw error;
        }
    }

    private async appendEvents(manager: EntityManager, dappId: DappId, actor: Actor, events: DappEventDetails[]): Promise<void> {
        for (const event of events) await this.events.append(manager, dappId, actor, event);
    }

    private adminAlert(dapp: Dapp, kind: AdminAlertKind): ConsoleEmail {
        return { template: "admin_alert", to: [...this.config.admin.emails], dapp, kind };
    }

    private async sendEmails(emails: ConsoleEmail[]): Promise<void> {
        for (const email of emails) {
            let event: DappEventDetails;
            try {
                await this.emailer.send(email);
                event = { type: "email_sent", details: { template: email.template } };
            } catch (error) {
                this.logger.warn(`Email ${email.template} for dApp ${email.dapp.id} failed: ${describeError(error)}`);
                event = {
                    type: "email_failed",
                    details: { template: email.template, error: error instanceof Error ? error.message : String(error) },
                };
            }
            this.metrics.countEmail(email.template, event.type === "email_sent" ? "sent" : "failed");
            try {
                await this.events.append(this.dataSource.manager, email.dapp.id, SYSTEM, event);
            } catch (error) {
                this.logger.error(
                    `Could not record ${event.type} for dApp ${email.dapp.id}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }
    }

    private async notifySlack(alert: SlackAlert): Promise<void> {
        try {
            await this.slack.notify(alert);
        } catch (error) {
            this.logger.warn(`Slack alert ${alert.kind} for dApp ${alert.dapp.id} failed: ${describeError(error)}`);
        }
    }

    private async counted<T>(action: TransitionAction, work: () => Promise<T>): Promise<T> {
        try {
            const result = await work();
            this.metrics.countTransition(action, "success");
            return result;
        } catch (error) {
            this.metrics.countTransition(action, consoleCode(error) ?? "error");
            throw error;
        }
    }
}
