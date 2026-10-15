import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../../config/console-config";
import type { Auth0ClientId, Dapp, DappFields, DappId, SyncedFields } from "@shared/console-domain/dapp";
import { clientIdOf, DAPP_FIELDS, DappStatus, directFieldsOf, syncedFieldsOf } from "@shared/console-domain/dapp";
import type { PendingChangeOutcome } from "@shared/console-domain/dapp-edits";
import { classifyEdit, diffFields, diffSyncedFields } from "@shared/console-domain/dapp-edits";
import type { DappEventDetails } from "@shared/console-domain/dapp-event";
import { ActorRole, Auth0Op, DappEventType } from "@shared/console-domain/dapp-event";
import { DappAction, transition } from "@shared/console-domain/dapp-transitions";
import type { SessionUser } from "../auth/session-user";
import { ConsoleException } from "../common/exception/console.exception";
import { consoleCode, describeError } from "../common/exception/describe-error";
import { ERROR_CODES } from "../common/exception/error-codes";
import type { AdminAlertKind } from "../notifications/emailer";
import type { Auth0Provisioner, ProvisioningErrorKind } from "../provisioning/auth0-provisioner";
import { AUTH0_PROVISIONER, ProvisioningError } from "../provisioning/auth0-provisioner";
import { SettingsRepository } from "../settings/repositories/settings.repository";
import type { TransitionAction } from "./dapps.metrics";
import { DappsMetrics } from "./dapps.metrics";
import { DappsNotifier } from "./dapps.notifier";
import { DappsErrorCode } from "./error/dapps-error-codes";
import type { Actor, StoredDappEvent } from "./repositories/dapp-events.repository";
import { DappEventsRepository, SYSTEM } from "./repositories/dapp-events.repository";
import type { AdminDappFilter, DappChanges, Page } from "./repositories/dapps.repository";
import { DappsRepository } from "./repositories/dapps.repository";

type Lookup = { id: DappId; ownerEmail: string } | { id: DappId };

type Apply<T> = (manager: EntityManager, dapp: Dapp, next: DappStatus) => Promise<T>;

type Auth0WriteEvent = Extract<DappEventDetails, { type: DappEventType.AUTH0_CREATED | DappEventType.AUTH0_UPDATED }>;

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

/**
 * Runs an Auth0 call and rethrows a provisioning error as an Auth0CallFailed that names the operation and client.
 * @param op The Auth0 operation.
 * @param clientId The client the call targets, if known.
 * @param call The call.
 * @returns What the call returns.
 */
async function callAuth0<T>(op: Auth0Op, clientId: Auth0ClientId | null, call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (error) {
        if (error instanceof ProvisioningError) throw new Auth0CallFailed(op, error.kind, error.message, clientId);
        throw error;
    }
}

/**
 * Tells a use case refused with a client error apart from one that failed.
 * @param error The thrown value.
 * @returns The log word, refused for an error code below 500 and failed otherwise.
 */
const refusedOrFailed = (error: unknown): string => {
    const code = consoleCode(error);
    return code !== undefined && ERROR_CODES[code].status < 500 ? "refused" : "failed";
};

/**
 * Gives the columns and events that apply an edit's outcome to the pending change.
 * @param outcome What the edit does to the pending change.
 * @param now The time to record as the change's request time.
 * @returns The columns and events.
 */
function pendingChangeEffects(outcome: PendingChangeOutcome, now: Date): Effects {
    switch (outcome.kind) {
        case "unchanged":
            return { columns: {}, events: [] };
        case "withdrawn":
            return {
                columns: { pendingChange: null, pendingChangeAt: null },
                events: [{ type: DappEventType.CHANGE_WITHDRAWN, details: {} }],
            };
        case "replaced":
            return {
                columns: { pendingChange: outcome.change, pendingChangeAt: now },
                events: [{ type: DappEventType.CHANGE_REQUESTED, details: { changes: outcome.changes } }],
            };
    }
}

/**
 * Builds the event actor for a dApp owner.
 * @param user The signed-in owner.
 * @returns The actor.
 */
const ownerActor = (user: SessionUser): Actor => ({ email: user.email, role: ActorRole.USER });

/**
 * Builds the event actor for an admin.
 * @param admin The signed-in admin.
 * @returns The actor.
 */
const adminActor = (admin: SessionUser): Actor => ({ email: admin.email, role: ActorRole.ADMIN });

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
        private readonly notifier: DappsNotifier,
        @Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>,
    ) {}

    /**
     * Finds the caller's dApp that is not removed, matching the email in any case.
     * @param user The caller.
     * @returns The dApp, or null when the caller has none.
     */
    findOwn(user: SessionUser): Promise<Dapp | null> {
        return this.dapps.findLiveByOwner(user.email);
    }

    /**
     * Loads a dApp in any status, or throws DAPP_NOT_FOUND.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async get(id: DappId): Promise<Dapp> {
        const dapp = await this.dapps.findById(id);
        if (dapp === null) throw new ConsoleException(DappsErrorCode.DAPP_NOT_FOUND);
        return dapp;
    }

    /**
     * Lists one page of dApps for the admin, with the count of every match.
     * @param filter The filters and sort.
     * @param page The page number and size.
     * @returns The page's dApps and the total.
     */
    list(filter: AdminDappFilter, page: Page): Promise<{ items: Dapp[]; total: number }> {
        return this.dapps.listForAdmin(filter, page);
    }

    /**
     * Lists a dApp's events newest first, or throws DAPP_NOT_FOUND for an unknown dApp.
     * @param id The dApp id.
     * @returns The events.
     */
    async listEvents(id: DappId): Promise<StoredDappEvent[]> {
        await this.get(id);
        return this.events.listForDapp(id);
    }

    /**
     * Registers a pending dApp for the caller, auto-approving it if it qualifies, then alerts the admins by email and Slack and, once approved, emails the owner. A failed alert does not fail the submission.
     * @param user The owner.
     * @param fields The submitted fields.
     * @returns The approved dApp, or the pending one when it was not auto-approved.
     */
    submit(user: SessionUser, fields: DappFields): Promise<Dapp> {
        return this.counted("submit", async () => {
            const submission = this.dataSource.transaction(async (manager) => {
                // Lock the owner's dApp before the settings row. An admin action can hold that dApp through its Auth0 calls,
                // and waiting for it while holding the settings row would stall every submission and settings change.
                if ((await this.dapps.findLiveByOwnerForUpdate(manager, user.email)) !== null)
                    throw new ConsoleException(DappsErrorCode.DAPP_ALREADY_EXISTS);
                const autoApproval = await this.settings.findAutoApprovalForUpdate(manager);
                const chosen =
                    autoApproval.enabled &&
                    !(await this.dapps.hasHadDapp(manager, user.email)) &&
                    (await this.events.countChosenForAutoApprovalInLastDay(manager)) <
                        this.configService.get("autoApproval.dailyCap", { infer: true });
                const dapp = await this.dapps.insert(manager, {
                    ...fields,
                    ownerEmail: user.email,
                    submittedAt: new Date(),
                });
                await this.events.append(manager, dapp.id, ownerActor(user), {
                    type: DappEventType.SUBMITTED,
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
                await this.notifier.submitted(dapp);
                return dapp;
            }
            await this.notifier.autoApproved(approved);
            return approved;
        });
    }

    /**
     * Edits the caller's live dApp at the expected version. A pending one changes in place, a rejected one is resubmitted, and an approved one applies direct fields at once and requests a change for synced fields. Resubmissions and change requests alert the admins.
     * @param user The owner.
     * @param id The dApp id the caller named.
     * @param expectedVersion The version the caller last read.
     * @param fields The new fields.
     * @returns The updated dApp.
     */
    editOwn(user: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted(DappAction.EDIT, async () => {
            const owner = ownerActor(user);
            const { dapp, alert, before } = await this.mutate(
                DappAction.EDIT,
                owner,
                { id, ownerEmail: user.email },
                expectedVersion,
                async (manager, live, next) => ({
                    ...(await (live.status === DappStatus.APPROVED
                        ? this.editApproved(manager, live, fields, owner)
                        : this.editInPlace(manager, live, next, fields, owner))),
                    before: live,
                }),
            );
            if (alert === "change_requested") await this.notifier.changeRequested(dapp);
            if (alert === "resubmitted") await this.notifier.resubmitted(dapp, before);
            return dapp;
        });
    }

    /**
     * Removes the caller's live dApp at the expected version.
     * @param user The owner.
     * @param id The dApp id the caller named.
     * @param expectedVersion The version the caller last read.
     * @returns The removed dApp.
     */
    removeOwn(user: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted(DappAction.REMOVE, () => {
            const owner = ownerActor(user);
            return this.mutate(DappAction.REMOVE, owner, { id, ownerEmail: user.email }, expectedVersion, (manager, live, next) =>
                this.removeIn(manager, live, next, owner),
            );
        });
    }

    /**
     * Approves a pending dApp at the expected version by creating its Auth0 client, or reusing one tagged with its id, then emails the owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The approved dApp.
     */
    approve(admin: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted(DappAction.APPROVE, async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate(DappAction.APPROVE, actor, { id }, expectedVersion, (manager, live, next) =>
                this.approveIn(manager, live, next, actor, DappEventType.APPROVED),
            );
            await this.notifier.approved(dapp);
            return dapp;
        });
    }

    /**
     * Rejects a pending dApp at the expected version, deletes any Auth0 client tagged with its id, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @param reason Why it was rejected.
     * @returns The rejected dApp.
     */
    reject(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted(DappAction.REJECT, async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate(DappAction.REJECT, actor, { id }, expectedVersion, async (manager, live, next) => {
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
                await this.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.REJECTED, details: { reason } },
                    ...deletion.events,
                ]);
                return rejected;
            });
            await this.notifier.rejected(dapp, reason);
            return dapp;
        });
    }

    /**
     * Applies an approved dApp's pending change to its fields and Auth0 client at the expected version, then emails the owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The updated dApp.
     */
    approveChange(admin: SessionUser, id: DappId, expectedVersion: number): Promise<Dapp> {
        return this.counted(DappAction.APPROVE_CHANGE, async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate(DappAction.APPROVE_CHANGE, actor, { id }, expectedVersion, async (manager, live, next) => {
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
                    { type: DappEventType.CHANGE_APPROVED, details: { changes: diffSyncedFields(live, change) } },
                    ...sync.events,
                ]);
                return changed;
            });
            await this.notifier.changeApproved(dapp);
            return dapp;
        });
    }

    /**
     * Drops an approved dApp's pending change at the expected version, resyncs its Auth0 client to the live fields, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @param reason Why the change was rejected.
     * @returns The updated dApp.
     */
    rejectChange(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted(DappAction.REJECT_CHANGE, async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate(DappAction.REJECT_CHANGE, actor, { id }, expectedVersion, async (manager, live, next) => {
                // Always resync: an approveChange that rolled back after Auth0 accepted the change leaves no auth0Error behind.
                const sync = await this.syncClient(live, syncedFieldsOf(live));
                const unchanged = await this.dapps.update(manager, live.id, {
                    status: next,
                    pendingChange: null,
                    pendingChangeAt: null,
                    ...sync.columns,
                });
                await this.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.CHANGE_REJECTED, details: { reason } },
                    ...sync.events,
                ]);
                return unchanged;
            });
            await this.notifier.changeRejected(dapp, reason);
            return dapp;
        });
    }

    /**
     * Applies an admin's edit at the expected version, syncing an approved dApp's Auth0 client when a synced field changed or the last sync failed, and emails the owner when anything changed.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @param fields The new fields.
     * @returns The updated dApp.
     */
    adminEdit(admin: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted(DappAction.ADMIN_EDIT, async () => {
            const actor = adminActor(admin);
            const { dapp, changed } = await this.mutate(
                DappAction.ADMIN_EDIT,
                actor,
                { id },
                expectedVersion,
                async (manager, live, next) => {
                    const changes = diffFields(DAPP_FIELDS, live, fields);
                    const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
                    const sync: Effects =
                        live.status === DappStatus.APPROVED && (live.auth0Error !== null || diffSyncedFields(live, fields).length > 0)
                            ? await this.syncClient(live, syncedFieldsOf(fields))
                            : { columns: {}, events: [] };
                    const edited = await this.dapps.update(manager, live.id, { ...fields, status: next, ...sync.columns });
                    await this.appendEvents(manager, live.id, actor, [...events, ...sync.events]);
                    return { dapp: edited, changed: changes.length > 0 };
                },
            );
            if (changed) await this.notifier.editedByAdmin(dapp);
            return dapp;
        });
    }

    /**
     * Moves a dApp to another owner at the expected version, without emailing either owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @param ownerEmail The new owner's email.
     * @returns The updated dApp.
     */
    changeOwner(admin: SessionUser, id: DappId, expectedVersion: number, ownerEmail: string): Promise<Dapp> {
        return this.counted(DappAction.CHANGE_OWNER, () => {
            const actor = adminActor(admin);
            return this.mutate(DappAction.CHANGE_OWNER, actor, { id }, expectedVersion, async (manager, live, next) => {
                const dapp = await this.dapps.update(manager, live.id, { status: next, ownerEmail });
                await this.appendEvents(manager, live.id, actor, [{ type: DappEventType.OWNER_CHANGED, details: {} }]);
                return dapp;
            });
        });
    }

    /**
     * Removes a dApp at the expected version, deletes its Auth0 client, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @param reason Why it was removed.
     * @returns The removed dApp.
     */
    adminRemove(admin: SessionUser, id: DappId, expectedVersion: number, reason: string): Promise<Dapp> {
        return this.counted(DappAction.REMOVE, async () => {
            const actor = adminActor(admin);
            const dapp = await this.mutate(DappAction.REMOVE, actor, { id }, expectedVersion, (manager, live, next) =>
                this.removeIn(manager, live, next, actor, reason),
            );
            await this.notifier.removedByAdmin(dapp, reason);
            return dapp;
        });
    }

    /**
     * Approves a newly chosen dApp as the system unless auto-approval was turned off first. Any failure is logged, not thrown, and leaves the dApp pending.
     * @param dapp The new pending dApp.
     * @returns The approved dApp, or null when it stays pending.
     */
    private async autoApprove(dapp: Dapp): Promise<Dapp | null> {
        try {
            return await this.counted("autoApprove", () =>
                this.mutate(DappAction.APPROVE, SYSTEM, { id: dapp.id }, dapp.version, async (manager, live, next) => {
                    // Read before the Auth0 calls, so a turned-off switch creates no client. No FOR UPDATE, since this transaction
                    // holds the dApp row through the Auth0 calls, and holding the settings row too would stall submissions.
                    if (!(await this.settings.findAutoApproval(manager)).enabled) throw new AutoApprovalTurnedOff();
                    return this.approveIn(manager, live, next, SYSTEM, DappEventType.AUTO_APPROVED);
                }),
            );
        } catch (error) {
            const message = `Auto-approval of dApp ${dapp.id} failed, leaving it pending: ${describeError(error)}`;
            if (error instanceof ConsoleException || error instanceof AutoApprovalTurnedOff) this.logger.warn(message);
            else this.logger.error(message, error instanceof Error ? error.stack : String(error));
            return null;
        }
    }

    /**
     * Applies an edit to a pending or rejected dApp's fields, turning a rejected dApp's edit into a resubmission.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param next The status the lifecycle allows.
     * @param fields The new fields.
     * @param owner The owner.
     * @returns The updated dApp and the admin alert to send, if any.
     */
    private async editInPlace(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        fields: DappFields,
        owner: Actor,
    ): Promise<{ dapp: Dapp; alert: AdminAlertKind | null }> {
        const changes = diffFields(DAPP_FIELDS, live, fields);
        const resubmitted = live.status === DappStatus.REJECTED;
        const dapp = await this.dapps.update(manager, live.id, {
            ...fields,
            status: next,
            ...(resubmitted && { rejectionReason: null, reviewedAt: null, reviewedBy: null, auth0Error: null, submittedAt: new Date() }),
        });
        const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
        if (resubmitted) events.push({ type: DappEventType.RESUBMITTED, details: {} });
        await this.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: resubmitted ? "resubmitted" : null };
    }

    /**
     * Applies an approved dApp's direct fields at once and turns its synced fields into a pending change for review.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param fields The new fields.
     * @param owner The owner.
     * @returns The updated dApp and the admin alert to send, if any.
     */
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
        if (directChanges.length > 0) events.push({ type: DappEventType.EDITED, details: { changes: directChanges } });
        await this.appendEvents(manager, live.id, owner, events);
        return { dapp, alert: pendingChange.kind === "replaced" ? "change_requested" : null };
    }

    /**
     * Provisions the dApp's Auth0 client and records the approval.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param next The status the lifecycle allows.
     * @param actor Who approves.
     * @param event The approval event to record, approved for an admin and auto_approved for the system.
     * @returns The approved dApp.
     */
    private async approveIn(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        actor: Actor,
        event: DappEventType.APPROVED | DappEventType.AUTO_APPROVED,
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

    /**
     * Deletes the dApp's Auth0 client, clears its pending change and records the removal.
     * @param manager The transaction's entity manager.
     * @param live The locked dApp.
     * @param next The status the lifecycle allows.
     * @param actor Who removes it.
     * @param reason Why an admin removed it. An owner gives none.
     * @returns The removed dApp.
     */
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
            { type: DappEventType.REMOVED, details: reason === undefined ? {} : { reason } },
            ...deletion.events,
        ]);
        return dapp;
    }

    /**
     * Creates the dApp's Auth0 client, or updates the one already tagged with its id, so a retry after a lost answer creates no duplicate.
     * @param dapp The dApp.
     * @returns The auth0_created or auth0_updated event.
     */
    private async provisionClient(dapp: Dapp): Promise<Auth0WriteEvent> {
        const payload = syncedFieldsOf(dapp);
        const existing = await callAuth0(Auth0Op.FIND, null, () => this.provisioner.findClient(dapp.id));
        if (existing !== null) {
            await callAuth0(Auth0Op.UPDATE, existing, () => this.provisioner.updateClient(dapp.id, existing, payload));
            return { type: DappEventType.AUTH0_UPDATED, details: { clientId: existing, payload } };
        }
        const clientId = await callAuth0(Auth0Op.CREATE, null, () => this.provisioner.createClient(dapp.id, payload));
        return { type: DappEventType.AUTH0_CREATED, details: { clientId, payload } };
    }

    /**
     * Writes the synced fields to the dApp's Auth0 client.
     * @param dapp The approved dApp.
     * @param payload The fields to write.
     * @returns The columns and events that record the sync.
     */
    private async syncClient(dapp: Dapp, payload: SyncedFields): Promise<Effects> {
        const clientId = clientIdOf(dapp);
        await callAuth0(Auth0Op.UPDATE, clientId, () => this.provisioner.updateClient(dapp.id, clientId, payload));
        return {
            columns: { auth0SyncedAt: new Date(), auth0Error: null },
            events: [{ type: DappEventType.AUTH0_UPDATED, details: { clientId, payload } }],
        };
    }

    /**
     * Deletes the dApp's Auth0 client, found by its tag when the dApp has no client id. A client tagged for another dApp is kept and recorded as an Auth0 error instead of failing.
     * @param dapp The dApp.
     * @param now The time to record as the sync time.
     * @returns The columns and events that record the deletion.
     */
    private async deleteClient(dapp: Dapp, now: Date): Promise<Effects> {
        const clientId = dapp.auth0ClientId ?? (await callAuth0(Auth0Op.FIND, null, () => this.provisioner.findClient(dapp.id)));
        if (clientId === null) return { columns: {}, events: [] };
        try {
            await callAuth0(Auth0Op.DELETE, clientId, () => this.provisioner.deleteClient(dapp.id, clientId));
            return {
                columns: { auth0SyncedAt: now, auth0Error: null },
                events: [{ type: DappEventType.AUTH0_DELETED, details: { clientId } }],
            };
        } catch (error) {
            if (error instanceof Auth0CallFailed && error.kind === "tag_mismatch")
                return {
                    columns: { auth0Error: error.message },
                    events: [{ type: DappEventType.AUTH0_FAILED, details: { op: Auth0Op.DELETE, error: error.message, clientId } }],
                };
            throw error;
        }
    }

    /**
     * Runs a lifecycle action on a dApp under a row lock, refusing it when the id or version is stale or the lifecycle forbids it, and logs the outcome. A failed Auth0 call rolls back the action's writes but keeps the recorded failure.
     * @param action The lifecycle action.
     * @param actor Who acts, for the log.
     * @param lookup The dApp id the caller named, plus the owner's email when only the owner's live dApp may be locked.
     * @param expectedVersion The version the caller last read.
     * @param apply Writes the change inside the transaction.
     * @returns What apply returns.
     */
    private async mutate<T>(action: DappAction, actor: Actor, lookup: Lookup, expectedVersion: number, apply: Apply<T>): Promise<T> {
        let dappId = "ownerEmail" in lookup ? null : lookup.id;
        try {
            const outcome = await this.dataSource.transaction(
                async (manager): Promise<{ ok: true; value: T } | { ok: false; failure: Auth0CallFailed }> => {
                    const dapp =
                        "ownerEmail" in lookup
                            ? await this.dapps.findLiveByOwnerForUpdate(manager, lookup.ownerEmail)
                            : await this.dapps.findByIdForUpdate(manager, lookup.id);
                    if (dapp === null) throw new ConsoleException(DappsErrorCode.DAPP_NOT_FOUND);
                    dappId = dapp.id;
                    if (dapp.id !== lookup.id || dapp.version !== expectedVersion) throw new ConsoleException(DappsErrorCode.DAPP_CHANGED);
                    const result = transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action);
                    if (!result.ok) throw new ConsoleException(DappsErrorCode[result.code]);
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
                throw new ConsoleException(
                    outcome.failure.kind === "failed" ? DappsErrorCode.PROVISIONING_FAILED : DappsErrorCode.PROVISIONING_REJECTED,
                );
            return outcome.value;
        } catch (error) {
            this.logger.log(`${action} dApp ${dappId ?? "(none)"} by ${actor.role} ${refusedOrFailed(error)}: ${describeError(error)}`);
            throw error;
        }
    }

    /**
     * Records a failed Auth0 call on the dApp without bumping its version, so the caller's retry with the same version still applies.
     * @param manager The transaction's entity manager.
     * @param dappId The dApp id.
     * @param failure The failed call.
     * @param actor Who acted.
     */
    private async recordAuth0Failure(manager: EntityManager, dappId: DappId, failure: Auth0CallFailed, actor: Actor): Promise<void> {
        this.logger.warn(`Auth0 ${failure.op} failed for dApp ${dappId} (${failure.kind}): ${failure.message}`);
        await this.dapps.setAuth0ErrorKeepingVersion(manager, dappId, failure.message);
        await this.events.append(manager, dappId, actor, {
            type: DappEventType.AUTH0_FAILED,
            details: { op: failure.op, error: failure.message, ...(failure.clientId !== null && { clientId: failure.clientId }) },
        });
    }

    /**
     * Appends events in order inside the caller's transaction.
     * @param manager The transaction's entity manager.
     * @param dappId The dApp id.
     * @param actor Who acted.
     * @param events The events to append.
     */
    private async appendEvents(manager: EntityManager, dappId: DappId, actor: Actor, events: DappEventDetails[]): Promise<void> {
        for (const event of events) await this.events.append(manager, dappId, actor, event);
    }

    /**
     * Runs a use case and counts its result under its action.
     * @param action The use case.
     * @param work The use case to run.
     * @returns What work returns.
     */
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
