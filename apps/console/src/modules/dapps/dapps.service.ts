import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../../config/console-config";
import { CONSOLE_CONFIG } from "../../config/console-config";
import type { Auth0ClientId, Dapp, DappFields, DappId, DappStatus, SyncedFields } from "../../domain/dapp";
import { AUTO_APPROVAL_DAILY_CAP, DAPP_FIELDS, directFieldsOf, SYNCED_FIELDS, syncedFieldsOf } from "../../domain/dapp";
import type { PendingChangeOutcome } from "../../domain/dapp-edits";
import { classifyEdit, diffFields } from "../../domain/dapp-edits";
import type { Auth0Op, DappEventDetails } from "../../domain/dapp-event";
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
import type { Auth0Provisioner, ProvisioningErrorKind } from "../provisioning/auth0-provisioner";
import { AUTH0_PROVISIONER, ProvisioningError } from "../provisioning/auth0-provisioner";
import { SettingsRepository } from "../settings/settings.repository";
import type { TransitionAction } from "./dapps.metrics";
import { DappsMetrics } from "./dapps.metrics";
import type { Actor, StoredDappEvent } from "./repositories/dapp-events.repository";
import { DappEventsRepository } from "./repositories/dapp-events.repository";
import type { AdminDappFilter, DappChanges, Page } from "./repositories/dapps.repository";
import { DappsRepository } from "./repositories/dapps.repository";

const SYSTEM: Actor = { email: null, role: "system" };

type Lookup = { id: DappId; ownerEmail: string } | { id: DappId };

type Apply<T> = (manager: EntityManager, dapp: Dapp, next: DappStatus) => Promise<T>;

type Auth0WriteEvent = Extract<DappEventDetails, { type: "auth0_created" | "auth0_updated" }>;

type Effects = { columns: DappChanges; events: DappEventDetails[] };

class AutoApprovalTurnedOff extends Error {
    override readonly name = "AutoApprovalTurnedOff";
}

class Auth0CallFailed extends Error {
    constructor(
        readonly op: Auth0Op,
        readonly kind: ProvisioningErrorKind,
        message: string,
        readonly clientId: Auth0ClientId | null,
    ) {
        super(message);
    }
}

async function callAuth0<T>(op: Auth0Op, clientId: Auth0ClientId | null, call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (error) {
        if (error instanceof ProvisioningError) throw new Auth0CallFailed(op, error.kind, error.message, clientId);
        throw error;
    }
}

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

function clientIdOf(dapp: Dapp): Auth0ClientId {
    if (dapp.auth0ClientId === null) throw new Error(`Approved dApp ${dapp.id} has no Auth0 client`);
    return dapp.auth0ClientId;
}

function rejectionReasonOf(dapp: Dapp): string {
    if (dapp.rejectionReason === null) throw new Error(`Rejected dApp ${dapp.id} has no rejection reason`);
    return dapp.rejectionReason;
}

function pendingChangeEffects(outcome: PendingChangeOutcome, now: Date): Effects {
    switch (outcome.kind) {
        case "unchanged":
            return { columns: {}, events: [] };
        case "withdrawn":
            return { columns: { pendingChange: null, pendingChangeAt: null }, events: [{ type: "change_withdrawn", details: {} }] };
        case "replaced":
            return {
                columns: { pendingChange: outcome.change, pendingChangeAt: now },
                events: [{ type: "change_requested", details: { changes: outcome.changes } }],
            };
    }
}

const ownerActor = (user: SessionUser): Actor => ({ email: user.email, role: "user" });

const adminActor = (admin: SessionUser): Actor => ({ email: admin.email, role: "admin" });

@Injectable()
export class DappsService {
    private readonly logger = new Logger(DappsService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly dapps: DappsRepository,
        private readonly events: DappEventsRepository,
        private readonly settings: SettingsRepository,
        private readonly metrics: DappsMetrics,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: Auth0Provisioner,
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

    list(filter: AdminDappFilter, page: Page): Promise<{ items: Dapp[]; total: number }> {
        return this.dapps.listForAdmin(filter, page);
    }

    async listEvents(id: DappId): Promise<StoredDappEvent[]> {
        await this.get(id);
        return this.events.listForDapp(id);
    }

    submit(user: SessionUser, fields: DappFields): Promise<Dapp> {
        return this.counted("submit", async () => {
            const submission = this.dataSource.transaction(async (manager) => {
                // Lock the owner's dApp before the settings row. An admin action can hold that dApp through its Auth0 calls,
                // and waiting for it while holding the settings row would stall every submission and settings change.
                if ((await this.dapps.findLiveByOwnerForUpdate(manager, user.email)) !== null)
                    throw new ConsoleException("DAPP_ALREADY_EXISTS");
                const autoApproval = await this.settings.findAutoApprovalForUpdate(manager);
                const chosen =
                    autoApproval.enabled &&
                    !(await this.dapps.hasHadDapp(manager, user.email)) &&
                    (await this.events.countChosenForAutoApprovalInLastDay(manager)) < AUTO_APPROVAL_DAILY_CAP;
                const dapp = await this.dapps.insert(manager, {
                    ...fields,
                    ownerEmail: user.email,
                    submittedAt: new Date(),
                });
                await this.events.append(manager, dapp.id, ownerActor(user), {
                    type: "submitted",
                    details: { chosenForAutoApproval: chosen },
                });
                return { dapp, chosen };
            });
            const { dapp, chosen } = await submission.catch((error: unknown) => {
                this.logger.log(`submit by user ${refusedOrFailed(error)}: ${describeError(error)}`);
                throw error;
            });
            this.logger.log(`submit dApp ${dapp.id} by user: -> pending${chosen ? ", chosen for auto-approval" : ""}`);

            const approved = chosen ? await this.autoApprove(dapp) : null;
            if (approved === null) {
                await this.sendEmails([this.adminAlert(dapp, "submitted")]);
                await this.notifySlack({ kind: "submitted", dapp });
                return dapp;
            }
            await this.sendEmails([
                { template: "dapp_approved", to: approved.ownerEmail, dapp: approved, clientId: clientIdOf(approved) },
                this.adminAlert(approved, "auto_approved"),
            ]);
            await this.notifySlack({ kind: "auto_approved", dapp: approved });
            return approved;
        });
    }

    editOwn(user: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted("edit", async () => {
            const owner = ownerActor(user);
            const { dapp, alert, before } = await this.mutate(
                "edit",
                owner,
                { id, ownerEmail: user.email },
                expectedVersion,
                async (manager, live, next) => ({
                    ...(await (live.status === "approved"
                        ? this.editApproved(manager, live, fields, owner)
                        : this.editInPlace(manager, live, next, fields, owner))),
                    before: live,
                }),
            );
            if (alert !== null) await this.sendEmails([this.adminAlert(dapp, alert)]);
            if (alert === "resubmitted") {
                await this.notifySlack({ kind: "resubmitted", dapp, rejected: before, rejectionReason: rejectionReasonOf(before) });
            }
            return dapp;
        });
    }

    removeOwn(user: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted("remove", () => {
            const owner = ownerActor(user);
            return this.mutate("remove", owner, { id, ownerEmail: user.email }, expectedVersion, (manager, live, next) =>
                this.removeIn(manager, live, next, owner),
            );
        });
    }

    approve(admin: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted("approve", async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate("approve", actor, { id }, expectedVersion, (manager, live, next) =>
                this.approveIn(manager, live, next, actor, "approved"),
            );
            await this.sendEmails([{ template: "dapp_approved", to: dapp.ownerEmail, dapp, clientId: clientIdOf(dapp) }]);
            return dapp;
        });
    }

    reject(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted("reject", async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate("reject", actor, { id }, expectedVersion, async (manager, live, next) => {
                const now = new Date();
                const deletion = await this.deleteClient(live, now);
                const rejected = await this.dapps.update(manager, live.id, {
                    auth0Error: null,
                    ...deletion.columns,
                    status: next,
                    rejectionReason: reason,
                    reviewedAt: now,
                    reviewedBy: admin.email,
                });
                await this.appendEvents(manager, live.id, actor, [{ type: "rejected", details: { reason } }, ...deletion.events]);
                return rejected;
            });
            await this.sendEmails([{ template: "dapp_rejected", to: dapp.ownerEmail, dapp, reason }]);
            return dapp;
        });
    }

    approveChange(admin: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted("approveChange", async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate("approveChange", actor, { id }, expectedVersion, async (manager, live, next) => {
                if (live.pendingChange === null) throw new Error(`dApp ${live.id} passed approveChange without a pending change`);
                const change = live.pendingChange;
                const sync = await this.syncClient(live, change);
                const changed = await this.dapps.update(manager, live.id, {
                    ...change,
                    status: next,
                    pendingChange: null,
                    pendingChangeAt: null,
                    ...sync.columns,
                });
                await this.appendEvents(manager, live.id, actor, [
                    { type: "change_approved", details: { changes: diffFields(SYNCED_FIELDS, live, change) } },
                    ...sync.events,
                ]);
                return changed;
            });
            await this.sendEmails([{ template: "change_approved", to: dapp.ownerEmail, dapp }]);
            return dapp;
        });
    }

    rejectChange(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted("rejectChange", async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate("rejectChange", actor, { id }, expectedVersion, async (manager, live, next) => {
                // Always resync: an approveChange that rolled back after Auth0 accepted the change leaves no auth0Error behind.
                const sync = await this.syncClient(live, syncedFieldsOf(live));
                const unchanged = await this.dapps.update(manager, live.id, {
                    status: next,
                    pendingChange: null,
                    pendingChangeAt: null,
                    ...sync.columns,
                });
                await this.appendEvents(manager, live.id, actor, [{ type: "change_rejected", details: { reason } }, ...sync.events]);
                return unchanged;
            });
            await this.sendEmails([{ template: "change_rejected", to: dapp.ownerEmail, dapp, reason }]);
            return dapp;
        });
    }

    adminEdit(admin: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted("adminEdit", async () => {
            const actor = adminActor(admin);
            const { dapp, changed } = await this.mutate("adminEdit", actor, { id }, expectedVersion, async (manager, live, next) => {
                const changes = diffFields(DAPP_FIELDS, live, fields);
                const events: DappEventDetails[] = changes.length > 0 ? [{ type: "edited", details: { changes } }] : [];
                const sync: Effects =
                    live.status === "approved" && (live.auth0Error !== null || diffFields(SYNCED_FIELDS, live, fields).length > 0)
                        ? await this.syncClient(live, syncedFieldsOf(fields))
                        : { columns: {}, events: [] };
                const edited = await this.dapps.update(manager, live.id, { ...fields, status: next, ...sync.columns });
                await this.appendEvents(manager, live.id, actor, [...events, ...sync.events]);
                return { dapp: edited, changed: changes.length > 0 };
            });
            if (changed) await this.sendEmails([{ template: "changed_by_admin", to: dapp.ownerEmail, dapp }]);
            return dapp;
        });
    }

    changeOwner(admin: SessionUser, id: DappId, expectedVersion: number, ownerEmail: string): Promise<Dapp> {
        return this.counted("changeOwner", () => {
            const actor = adminActor(admin);
            return this.mutate("changeOwner", actor, { id }, expectedVersion, async (manager, live, next) => {
                const dapp = await this.dapps.update(manager, live.id, { status: next, ownerEmail });
                await this.appendEvents(manager, live.id, actor, [{ type: "owner_changed", details: {} }]);
                return dapp;
            });
        });
    }

    adminRemove(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted("remove", async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate("remove", actor, { id }, expectedVersion, (manager, live, next) =>
                this.removeIn(manager, live, next, actor, reason),
            );
            await this.sendEmails([{ template: "removed_by_admin", to: dapp.ownerEmail, dapp, reason }]);
            return dapp;
        });
    }

    private async autoApprove(dapp: Dapp): Promise<Dapp | null> {
        try {
            return await this.counted("autoApprove", () =>
                this.mutate("approve", SYSTEM, { id: dapp.id }, dapp.version, async (manager, live, next) => {
                    // Read before the Auth0 calls, so a turned-off switch creates no client. No FOR UPDATE, since this transaction
                    // holds the dApp row through the Auth0 calls, and holding the settings row too would stall submissions.
                    if (!(await this.settings.findAutoApproval(manager)).enabled) throw new AutoApprovalTurnedOff();
                    return this.approveIn(manager, live, next, SYSTEM, "auto_approved");
                }),
            );
        } catch (error) {
            const message = `Auto-approval of dApp ${dapp.id} failed, leaving it pending: ${describeError(error)}`;
            if (error instanceof ConsoleException || error instanceof AutoApprovalTurnedOff) this.logger.warn(message);
            else this.logger.error(message, error instanceof Error ? error.stack : String(error));
            return null;
        }
    }

    private async editInPlace(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        fields: DappFields,
        owner: Actor,
    ): Promise<{ dapp: Dapp; alert: AdminAlertKind | null }> {
        const changes = diffFields(DAPP_FIELDS, live, fields);
        const resubmitted = live.status === "rejected";
        const dapp = await this.dapps.update(manager, live.id, {
            ...fields,
            status: next,
            ...(resubmitted && { rejectionReason: null, reviewedAt: null, reviewedBy: null, auth0Error: null, submittedAt: new Date() }),
        });
        const events: DappEventDetails[] = changes.length > 0 ? [{ type: "edited", details: { changes } }] : [];
        if (resubmitted) events.push({ type: "resubmitted", details: {} });
        await this.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: resubmitted ? "resubmitted" : null };
    }

    private async editApproved(
        manager: EntityManager,
        live: Dapp,
        fields: DappFields,
        owner: Actor,
    ): Promise<{ dapp: Dapp; alert: AdminAlertKind | null }> {
        const { directChanges, pendingChange } = classifyEdit(live, live.pendingChange, fields);
        const effects = pendingChangeEffects(pendingChange, new Date());
        const dapp = await this.dapps.update(manager, live.id, {
            ...effects.columns,
            ...directFieldsOf(fields),
        });
        const events = [...effects.events];
        if (directChanges.length > 0) events.push({ type: "edited", details: { changes: directChanges } });
        await this.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: pendingChange.kind === "replaced" ? "change_requested" : null };
    }

    private async approveIn(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        actor: Actor,
        event: "approved" | "auto_approved",
    ): Promise<Dapp> {
        const auth0 = await this.provisionClient(live);
        const now = new Date();
        const dapp = await this.dapps.update(manager, live.id, {
            status: next,
            reviewedAt: now,
            reviewedBy: actor.email,
            auth0ClientId: auth0.details.clientId,
            auth0SyncedAt: now,
            auth0Error: null,
        });
        await this.appendEvents(manager, live.id, actor, [{ type: event, details: {} }, auth0]);
        return dapp;
    }

    private async removeIn(manager: EntityManager, live: Dapp, next: DappStatus, actor: Actor, reason?: string): Promise<Dapp> {
        const now = new Date();
        const deletion = await this.deleteClient(live, now);
        const dapp = await this.dapps.update(manager, live.id, {
            ...(reason !== undefined && { removalReason: reason }),
            pendingChange: null,
            pendingChangeAt: null,
            auth0Error: null,
            ...deletion.columns,
            status: next,
            removedAt: now,
            removedBy: actor.email,
        });
        await this.appendEvents(manager, live.id, actor, [
            { type: "removed", details: reason === undefined ? {} : { reason } },
            ...deletion.events,
        ]);
        return dapp;
    }

    private async provisionClient(dapp: Dapp): Promise<Auth0WriteEvent> {
        const payload = syncedFieldsOf(dapp);
        const existing = await callAuth0("find", null, () => this.provisioner.findClient(dapp.id));
        if (existing !== null) {
            await callAuth0("update", existing, () => this.provisioner.updateClient(dapp.id, existing, payload));
            return { type: "auth0_updated", details: { clientId: existing, payload } };
        }
        const clientId = await callAuth0("create", null, () => this.provisioner.createClient(dapp.id, payload));
        return { type: "auth0_created", details: { clientId, payload } };
    }

    private async syncClient(dapp: Dapp, payload: SyncedFields): Promise<Effects> {
        const clientId = clientIdOf(dapp);
        await callAuth0("update", clientId, () => this.provisioner.updateClient(dapp.id, clientId, payload));
        return {
            columns: { auth0SyncedAt: new Date(), auth0Error: null },
            events: [{ type: "auth0_updated", details: { clientId, payload } }],
        };
    }

    private async deleteClient(dapp: Dapp, now: Date): Promise<Effects> {
        const clientId = dapp.auth0ClientId ?? (await callAuth0("find", null, () => this.provisioner.findClient(dapp.id)));
        if (clientId === null) return { columns: {}, events: [] };
        try {
            await callAuth0("delete", clientId, () => this.provisioner.deleteClient(dapp.id, clientId));
            return { columns: { auth0SyncedAt: now, auth0Error: null }, events: [{ type: "auth0_deleted", details: { clientId } }] };
        } catch (error) {
            if (error instanceof Auth0CallFailed && error.kind === "tag_mismatch")
                return {
                    columns: { auth0Error: error.message },
                    events: [{ type: "auth0_failed", details: { op: "delete", error: error.message, clientId } }],
                };
            throw error;
        }
    }

    private async mutate<T>(action: DappAction, actor: Actor, lookup: Lookup, expectedVersion: number, apply: Apply<T>): Promise<T> {
        let dappId = "ownerEmail" in lookup ? null : lookup.id;
        try {
            const outcome = await this.dataSource.transaction(
                async (manager): Promise<{ ok: true; value: T } | { ok: false; failure: Auth0CallFailed }> => {
                    const dapp =
                        "ownerEmail" in lookup
                            ? await this.dapps.findLiveByOwnerForUpdate(manager, lookup.ownerEmail)
                            : await this.dapps.findByIdForUpdate(manager, lookup.id);
                    if (dapp === null) throw new ConsoleException("DAPP_NOT_FOUND");
                    dappId = dapp.id;
                    if (dapp.id !== lookup.id || dapp.version !== expectedVersion) throw new ConsoleException("DAPP_CHANGED");
                    const result = transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action);
                    if (!result.ok) throw new ConsoleException(result.code);
                    try {
                        // A nested transaction is a savepoint.
                        const value = await manager.transaction((savepoint) => apply(savepoint, dapp, result.next));
                        this.logger.log(`${action} dApp ${dapp.id} by ${actor.role}: ${dapp.status} -> ${result.next}`);
                        return { ok: true, value };
                    } catch (error) {
                        if (!(error instanceof Auth0CallFailed)) throw error;
                        await this.recordAuth0Failure(manager, dapp.id, error, actor);
                        return { ok: false, failure: error };
                    }
                },
            );
            if (!outcome.ok)
                throw new ConsoleException(outcome.failure.kind === "failed" ? "PROVISIONING_FAILED" : "PROVISIONING_REJECTED");
            return outcome.value;
        } catch (error) {
            this.logger.log(`${action} dApp ${dappId ?? "(none)"} by ${actor.role} ${refusedOrFailed(error)}: ${describeError(error)}`);
            throw error;
        }
    }

    private async recordAuth0Failure(manager: EntityManager, dappId: DappId, failure: Auth0CallFailed, actor: Actor): Promise<void> {
        this.logger.warn(`Auth0 ${failure.op} failed for dApp ${dappId} (${failure.kind}): ${failure.message}`);
        await this.dapps.setAuth0ErrorKeepingVersion(manager, dappId, failure.message);
        await this.events.append(manager, dappId, actor, {
            type: "auth0_failed",
            details: { op: failure.op, error: failure.message, ...(failure.clientId !== null && { clientId: failure.clientId }) },
        });
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
