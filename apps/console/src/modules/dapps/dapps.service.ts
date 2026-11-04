import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { Dapp, DappFields, DappId, DappStatus } from "@shared/console-domain/dapp";
import { DAPP_FIELDS } from "@shared/console-domain/dapp";
import { diffFields } from "@shared/console-domain/dapp-edits";
import type { DappEventDetails } from "@shared/console-domain/dapp-event";
import { ActorRole, DappEventType } from "@shared/console-domain/dapp-event";
import { DappAction, transition } from "@shared/console-domain/dapp-transitions";
import type { SessionUser } from "../auth/session-user";
import { ConsoleException } from "../common/exception/console.exception";
import { consoleCode, describeError } from "../common/exception/describe-error";
import { ERROR_CODES } from "../common/exception/error-codes";
import type { TransitionAction } from "./dapps.metrics";
import { DappsMetrics } from "./dapps.metrics";
import { DappsNotifier } from "./dapps.notifier";
import { DappsErrorCode } from "./error/dapps-error-codes";
import type { Actor, StoredDappEvent } from "./repositories/dapp-events.repository";
import { DappEventsRepository } from "./repositories/dapp-events.repository";
import { DappsRepository } from "./repositories/dapps.repository";

type Apply<T> = (manager: EntityManager, dapp: Dapp, next: DappStatus) => Promise<T>;

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
 * Builds the event actor for a dApp owner.
 * @param user The signed-in owner.
 * @returns The actor.
 */
const ownerActor = (user: SessionUser): Actor => ({ email: user.email, role: ActorRole.USER });

@Injectable()
export class DappsService {
    private readonly logger = new Logger(DappsService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly dapps: DappsRepository,
        private readonly events: DappEventsRepository,
        private readonly metrics: DappsMetrics,
        private readonly notifier: DappsNotifier,
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
     * Lists a dApp's events newest first, or throws DAPP_NOT_FOUND for an unknown dApp.
     * @param id The dApp id.
     * @returns The events.
     */
    async listEvents(id: DappId): Promise<StoredDappEvent[]> {
        await this.get(id);
        return this.events.listForDapp(id);
    }

    /**
     * Registers a pending dApp for the caller, then alerts the admins by email and Slack. A failed alert does not fail the submission.
     * @param user The owner.
     * @param fields The submitted fields.
     * @returns The new dApp.
     */
    submit(user: SessionUser, fields: DappFields): Promise<Dapp> {
        return this.counted("submit", async () => {
            const submission = this.dataSource.transaction(async (manager) => {
                if ((await this.dapps.findLiveByOwnerForUpdate(manager, user.email)) !== null)
                    throw new ConsoleException(DappsErrorCode.DAPP_ALREADY_EXISTS);
                const dapp = await this.dapps.insert(manager, {
                    ...fields,
                    ownerEmail: user.email,
                    submittedAt: new Date(),
                });
                await this.events.append(manager, dapp.id, ownerActor(user), {
                    type: DappEventType.SUBMITTED,
                    details: { chosenForAutoApproval: false },
                });
                return dapp;
            });
            const dapp = await submission.catch((error: unknown) => {
                this.logger.log(`submit by user ${refusedOrFailed(error)}: ${describeError(error)}`);
                throw error;
            });
            this.logger.log(`submit dApp ${dapp.id} by user: -> pending`);
            await this.notifier.submitted(dapp);
            return dapp;
        });
    }

    /**
     * Applies the caller's edit to their live dApp at the expected version and logs the changed fields.
     * @param user The owner.
     * @param id The dApp id the caller named.
     * @param expectedVersion The version the caller last read.
     * @param fields The new fields.
     * @returns The updated dApp.
     */
    editOwn(user: SessionUser, id: DappId, expectedVersion: number, fields: DappFields): Promise<Dapp> {
        return this.counted(DappAction.EDIT, () => {
            const owner = ownerActor(user);
            return this.mutate(DappAction.EDIT, owner, user.email, id, expectedVersion, async (manager, live, next) => {
                const changes = diffFields(DAPP_FIELDS, live, fields);
                const dapp = await this.dapps.update(manager, live.id, { ...fields, status: next });
                await this.appendEvents(
                    manager,
                    live.id,
                    owner,
                    changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [],
                );
                return dapp;
            });
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
            return this.mutate(DappAction.REMOVE, owner, user.email, id, expectedVersion, async (manager, live, next) => {
                const dapp = await this.dapps.update(manager, live.id, { status: next, removedAt: new Date(), removedBy: owner.email });
                await this.appendEvents(manager, live.id, owner, [{ type: DappEventType.REMOVED, details: {} }]);
                return dapp;
            });
        });
    }

    /**
     * Runs a lifecycle action on the owner's live dApp under a row lock, refusing it when the id or version is stale or the lifecycle forbids it, and logs the outcome.
     * @param action The lifecycle action.
     * @param actor Who acts, for the log.
     * @param ownerEmail The owner whose live dApp is locked.
     * @param id The dApp id the caller named.
     * @param expectedVersion The version the caller last read.
     * @param apply Writes the change inside the transaction.
     * @returns What apply returns.
     */
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
                if (dapp === null) throw new ConsoleException(DappsErrorCode.DAPP_NOT_FOUND);
                dappId = dapp.id;
                if (dapp.id !== id || dapp.version !== expectedVersion) throw new ConsoleException(DappsErrorCode.DAPP_CHANGED);
                const result = transition({ status: dapp.status, hasPendingChange: dapp.pendingChange !== null }, action);
                if (!result.ok) throw new ConsoleException(DappsErrorCode[result.code]);
                const value = await apply(manager, dapp, result.next);
                this.logger.log(`${action} dApp ${dapp.id} by ${actor.role}: ${dapp.status} -> ${result.next}`);
                return value;
            });
        } catch (error) {
            this.logger.log(`${action} dApp ${dappId ?? "(none)"} by ${actor.role} ${refusedOrFailed(error)}: ${describeError(error)}`);
            throw error;
        }
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
