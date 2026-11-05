import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager, Not, QueryFailedError } from "typeorm";
import { Dapp, DappEvent, OWNER_EMAIL_LIVE_INDEX } from "@database/console/entities";
import {
    Auth0Op,
    DappAction,
    DappEventDetails,
    DappEventType,
    DappStatus,
    SyncedFields,
    syncedFieldsOf,
    transition,
} from "@shared/modules/dapp";
import { BusinessException } from "../common/exception/business.exception";
import { AUTH0_PROVISIONER } from "../provisioning/provisioning.tokens";
import { ProvisioningError, ProvisioningErrorKind } from "../provisioning/interfaces/i-auth0-provisioner.service";
import type { IAuth0ProvisionerService } from "../provisioning/interfaces/i-auth0-provisioner.service";
import { SettingService } from "../setting/setting.service";
import { DappMetricsProvider, TransitionAction } from "./dapp.metrics";
import { DappErrorCode } from "./error/dapp.error-codes";
import { Actor, SYSTEM } from "./types/actor";

export type DappChanges = Partial<Omit<Dapp, "id" | "version" | "createdAt" | "updatedAt">>;

/** The dApp id the caller named, plus the owner's email when only the owner's live dApp may be locked. */
export type Lookup = { id: string; ownerEmail: string } | { id: string };

export type Apply<T> = (manager: EntityManager, dapp: Dapp, next: DappStatus) => Promise<T>;

export type Effects = { columns: DappChanges; events: DappEventDetails[] };

type Auth0WriteEvent = Extract<DappEventDetails, { type: typeof DappEventType.AUTH0_CREATED | typeof DappEventType.AUTH0_UPDATED }>;

class AutoApprovalTurnedOff extends Error {
    override readonly name = "AutoApprovalTurnedOff";
}

class Auth0CallFailed extends Error {
    constructor(
        readonly op: Auth0Op,
        readonly kind: ProvisioningErrorKind,
        message: string,
        readonly clientId: string | null,
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
async function callAuth0<T>(op: Auth0Op, clientId: string | null, call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (error) {
        if (error instanceof ProvisioningError) throw new Auth0CallFailed(op, error.kind, error.message, clientId);
        throw error;
    }
}

/**
 * Reads an approved dApp's Auth0 client id, throwing when it has none.
 * @param dapp The approved dApp.
 * @returns The client id.
 */
export function clientIdOf(dapp: Dapp): string {
    if (dapp.auth0ClientId === null) throw new Error(`Approved dApp ${dapp.id} has no Auth0 client`);
    return dapp.auth0ClientId;
}

/**
 * Maps the database errors a dApp write can expect, a second live dApp for one email or a row lock timeout, to their business error.
 * @param error The thrown value.
 * @returns The business error, or the thrown value for any other error.
 */
function fromPostgresError(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const { code, constraint } = error.driverError as { code?: string; constraint?: string };
    if (code === "23505" && constraint === OWNER_EMAIL_LIVE_INDEX) return new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
    if (code === "55P03") return new BusinessException(DappErrorCode.DAPP_CHANGED);
    return error;
}

/**
 * Tells a use case refused with a client error apart from one that failed.
 * @param error The thrown value.
 * @returns The log word, refused for a status below 500 and failed otherwise.
 */
export const refusedOrFailed = (error: unknown): string =>
    error instanceof HttpException && error.getStatus() < 500 ? "refused" : "failed";

/**
 * Describes a thrown value for a log line by its error code, or by its name and driver code, never by its message.
 * @param error The thrown value.
 * @returns The description.
 */
export function describeError(error: unknown): string {
    if (error instanceof BusinessException) return error.message;
    if (!(error instanceof Error)) return typeof error;
    const driverCode = "code" in error ? error.code : undefined;
    return typeof driverCode === "string" ? `${error.name} (${driverCode})` : error.name;
}

/**
 * Runs the dApp lifecycle shared by the owner and admin use cases: the locked, versioned transaction, the transition check,
 * the Auth0 calls and the event log.
 */
@Injectable()
export class DappLifecycleService {
    private readonly logger = new Logger(DappLifecycleService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly settingService: SettingService,
        private readonly metrics: DappMetricsProvider,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: IAuth0ProvisionerService,
    ) {}

    /**
     * Finds the owner's dApp that is not removed, matching the email in any case.
     * @param manager The entity manager, a transaction's when lock is set.
     * @param ownerEmail The owner's email.
     * @param lock Whether to lock the row until the transaction ends.
     * @returns The dApp, or null.
     */
    findLiveByOwner(manager: EntityManager, ownerEmail: string, lock = false): Promise<Dapp | null> {
        return manager.findOne(Dapp, {
            where: { ownerEmail, status: Not(DappStatus.REMOVED) },
            ...(lock && { lock: { mode: "pessimistic_write" as const } }),
        });
    }

    /**
     * Applies the changes and reads the row back.
     * @param manager The transaction's entity manager.
     * @param id The dApp id.
     * @param changes The columns to change.
     * @returns The updated dApp.
     */
    async update(manager: EntityManager, id: string, changes: DappChanges): Promise<Dapp> {
        await manager.update(Dapp, { id }, changes);
        return manager.findOneByOrFail(Dapp, { id });
    }

    /**
     * Appends events in order inside the caller's transaction.
     * @param manager The transaction's entity manager.
     * @param dappId The dApp id.
     * @param actor Who acted.
     * @param events The events to append.
     */
    async appendEvents(manager: EntityManager, dappId: string, actor: Actor, events: DappEventDetails[]): Promise<void> {
        for (const event of events) {
            await manager.insert(DappEvent, {
                dappId,
                type: event.type,
                details: event.details,
                actorEmail: actor.email,
                actorRole: actor.role,
            });
        }
    }

    /**
     * Runs work in a transaction, mapping the database errors a dApp write can expect to their business error.
     * @param work The work to run.
     * @returns What work returns.
     */
    async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
        try {
            return await this.dataSource.transaction(work);
        } catch (error) {
            throw fromPostgresError(error);
        }
    }

    /**
     * Runs a use case and counts its result under its action.
     * @param action The use case.
     * @param work The use case to run.
     * @returns What work returns.
     */
    async counted<T>(action: TransitionAction, work: () => Promise<T>): Promise<T> {
        try {
            const result = await work();
            this.metrics.countTransition(action, "success");
            return result;
        } catch (error) {
            this.metrics.countTransition(action, error instanceof BusinessException ? error.message : "error");
            throw error;
        }
    }

    /**
     * Runs a lifecycle action on a dApp under a row lock, refusing it when the id or version is stale or the lifecycle forbids it, and logs the outcome. A failed Auth0 call rolls back the action's writes but keeps the recorded failure.
     * @param action The lifecycle action.
     * @param actor Who acts, for the log.
     * @param lookup The dApp the caller named.
     * @param expectedVersion The version the caller last read.
     * @param apply Writes the change inside the transaction.
     * @returns What apply returns.
     */
    async mutate<T>(action: DappAction, actor: Actor, lookup: Lookup, expectedVersion: number, apply: Apply<T>): Promise<T> {
        let dappId = "ownerEmail" in lookup ? null : lookup.id;
        try {
            const outcome = await this.transaction(
                async (manager): Promise<{ ok: true; value: T } | { ok: false; failure: Auth0CallFailed }> => {
                    const dapp =
                        "ownerEmail" in lookup
                            ? await this.findLiveByOwner(manager, lookup.ownerEmail, true)
                            : await manager.findOne(Dapp, { where: { id: lookup.id }, lock: { mode: "pessimistic_write" } });
                    if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
                    dappId = dapp.id;
                    if (dapp.id !== lookup.id || dapp.version !== expectedVersion) throw new BusinessException(DappErrorCode.DAPP_CHANGED);
                    const result = transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action);
                    if (!result.ok) throw new BusinessException(DappErrorCode[result.code]);
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
                throw new BusinessException(
                    outcome.failure.kind === "failed" ? DappErrorCode.PROVISIONING_FAILED : DappErrorCode.PROVISIONING_REJECTED,
                );
            return outcome.value;
        } catch (error) {
            this.logger.log(`${action} dApp ${dappId ?? "(none)"} by ${actor.role} ${refusedOrFailed(error)}: ${describeError(error)}`);
            throw error;
        }
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
    async approveIn(
        manager: EntityManager,
        live: Dapp,
        next: DappStatus,
        actor: Actor,
        event: typeof DappEventType.APPROVED | typeof DappEventType.AUTO_APPROVED,
    ): Promise<Dapp> {
        const auth0 = await this.provisionClient(live);
        const now = new Date();
        const dapp = await this.update(manager, live.id, {
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
    async removeIn(manager: EntityManager, live: Dapp, next: DappStatus, actor: Actor, reason?: string): Promise<Dapp> {
        const now = new Date();
        const deletion = await this.deleteClient(live, now);
        const dapp = await this.update(manager, live.id, {
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
     * Approves a newly chosen dApp as the system unless auto-approval was turned off first. Any failure is logged, not thrown, and leaves the dApp pending.
     * @param dapp The new pending dApp.
     * @returns The approved dApp, or null when it stays pending.
     */
    async autoApprove(dapp: Dapp): Promise<Dapp | null> {
        try {
            return await this.counted("autoApprove", () =>
                this.mutate(DappAction.APPROVE, SYSTEM, { id: dapp.id }, dapp.version, async (manager, live, next) => {
                    // Read before the Auth0 calls, so a turned-off switch creates no client. No FOR UPDATE, since this transaction
                    // holds the dApp row through the Auth0 calls, and holding the settings row too would stall submissions.
                    if (!(await this.settingService.isAutoApprovalEnabled(manager))) throw new AutoApprovalTurnedOff();
                    return this.approveIn(manager, live, next, SYSTEM, DappEventType.AUTO_APPROVED);
                }),
            );
        } catch (error) {
            const message = `Auto-approval of dApp ${dapp.id} failed, leaving it pending: ${describeError(error)}`;
            if (error instanceof BusinessException || error instanceof AutoApprovalTurnedOff) this.logger.warn(message);
            else this.logger.error(message, error instanceof Error ? error.stack : String(error));
            return null;
        }
    }

    /**
     * Writes the synced fields to the dApp's Auth0 client.
     * @param dapp The approved dApp.
     * @param payload The fields to write.
     * @returns The columns and events that record the sync.
     */
    async syncClient(dapp: Dapp, payload: SyncedFields): Promise<Effects> {
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
    async deleteClient(dapp: Dapp, now: Date): Promise<Effects> {
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
     * Records a failed Auth0 call on the dApp without bumping its version, so the caller's retry with the same version still applies.
     * @param manager The transaction's entity manager.
     * @param dappId The dApp id.
     * @param failure The failed call.
     * @param actor Who acted.
     */
    private async recordAuth0Failure(manager: EntityManager, dappId: string, failure: Auth0CallFailed, actor: Actor): Promise<void> {
        this.logger.warn(`Auth0 ${failure.op} failed for dApp ${dappId} (${failure.kind}): ${failure.message}`);
        // Raw SQL, so neither the version nor updated_at changes.
        await manager.query(`UPDATE "dapp" SET "auth0_error" = $1 WHERE "id" = $2`, [failure.message, dappId]);
        await this.appendEvents(manager, dappId, actor, [
            {
                type: DappEventType.AUTH0_FAILED,
                details: { op: failure.op, error: failure.message, ...(failure.clientId !== null && { clientId: failure.clientId }) },
            },
        ]);
    }
}
