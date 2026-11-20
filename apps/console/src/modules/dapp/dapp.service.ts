import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { And, ArrayContainedBy, ArrayContains, DataSource, EntityManager, FindOptionsWhere, In, IsNull, QueryFailedError } from "typeorm";
import { Dapp, DappChange, OWNER_EMAIL_LIVE_INDEX } from "@database/console/entities";
import { changedFields, DAPP_FIELDS, DappChangeStatus, DappField, DappFields, DappStatus, FieldValue } from "@shared/modules/dapp";
import { Role, SessionUser } from "../auth/types/session-user";
import { BusinessException } from "../common/exception/business.exception";
import { AdminAlertKind, SlackAlert } from "../notification/interfaces/i-slack-notifier.service";
import type { ISlackNotifierService } from "../notification/interfaces/i-slack-notifier.service";
import { SLACK_NOTIFIER } from "../notification/notification.tokens";
import { DappClient } from "../provisioning/interfaces/i-auth0-provisioner.service";
import type { IAuth0ProvisionerService } from "../provisioning/interfaces/i-auth0-provisioner.service";
import { AUTH0_PROVISIONER } from "../provisioning/provisioning.tokens";
import { DappMetricsProvider } from "./dapp.metrics";
import { DappErrorCode } from "./error/dapp.error-codes";
import { CreateDappRequest } from "./requests/create-dapp.request";
import { UpdateDappRequest } from "./requests/update-dapp.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
import { DappDto } from "./dtos/dapp.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";

/**
 * Tells whether the error is the unique index that allows one live dApp per owner email.
 * @param error The thrown value.
 * @returns Whether the owner already has a dApp.
 */
function isOwnerConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    // 23505 is Postgres' unique_violation.
    const { code, constraint } = error.driverError as { code?: string; constraint?: string };
    return code === "23505" && constraint === OWNER_EMAIL_LIVE_INDEX;
}

/**
 * Keeps the fields a change sets, dropping the ones it leaves as they are.
 * @param change The change.
 * @returns The fields that change, with their new values.
 */
function fieldsOf(change: DappChange): Partial<DappFields> {
    const fields: Partial<Record<DappField, FieldValue>> = {};
    for (const field of DAPP_FIELDS) {
        const value = change[field];
        if (value !== null) fields[field] = value;
    }
    return fields as Partial<DappFields>;
}

/**
 * Builds the Auth0 client of a dApp, with the fields its owner submitted.
 * @param dapp The dApp.
 * @returns The client.
 */
function clientOf(dapp: Dapp): DappClient {
    return {
        dappId: dapp.id,
        name: dapp.name,
        description: dapp.description,
        logoUrl: dapp.logoUrl,
        callbackUrls: dapp.callbackUrls,
        logoutUrls: dapp.logoutUrls,
        webOrigins: dapp.webOrigins,
    };
}

/**
 * Matches the dApps that still hold every field an approval read. An owner edit landing during the Auth0 call then
 * cannot be approved unreviewed. Lists compare as sets because TypeORM's find options cannot express array equality.
 * @param dapp The dApp, as the approval read it.
 * @returns The condition.
 */
function holding(dapp: Dapp): FindOptionsWhere<Dapp> {
    return {
        name: dapp.name,
        description: dapp.description,
        logoUrl: dapp.logoUrl,
        contactEmail: dapp.contactEmail,
        mauBracket: dapp.mauBracket,
        callbackUrls: And(ArrayContains(dapp.callbackUrls), ArrayContainedBy(dapp.callbackUrls)),
        logoutUrls: And(ArrayContains(dapp.logoutUrls), ArrayContainedBy(dapp.logoutUrls)),
        webOrigins: And(ArrayContains(dapp.webOrigins), ArrayContainedBy(dapp.webOrigins)),
    };
}

@Injectable()
export class DappService {
    private readonly logger = new Logger(DappService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: IAuth0ProvisionerService,
        @Inject(SLACK_NOTIFIER) private readonly slack: ISlackNotifierService,
        private readonly metrics: DappMetricsProvider,
    ) {}

    /**
     * Lists dApps with their pending change, oldest first. An admin gets every dApp, and anyone else their own, which is at
     * most one.
     * @param user The caller.
     * @param request The page.
     * @returns The page.
     */
    async list(user: SessionUser, { page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListDappsRequest): Promise<PaginatedDappsDto> {
        const { manager } = this.dataSource;
        const [dapps, total] = await manager.findAndCount(Dapp, {
            where: user.role === Role.ADMIN ? {} : { ownerEmail: user.email },
            order: { createdAt: "ASC", id: "ASC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        const pendingChanges = await manager.findBy(DappChange, {
            dappId: In(dapps.map((dapp) => dapp.id)),
            status: DappChangeStatus.PENDING,
        });
        return PaginatedDappsDto.fromEntities(dapps, pendingChanges, total, page, pageSize);
    }

    /**
     * Reads one dApp with its pending change. An admin can read any dApp, anyone else only their own.
     * @param user The caller.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async get(user: SessionUser, id: string): Promise<DappDto> {
        const { manager } = this.dataSource;
        const dapp = await manager.findOneBy(Dapp, user.role === Role.ADMIN ? { id } : { id, ownerEmail: user.email });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        return DappDto.fromEntity(dapp, await this.pendingChangeOf(manager, dapp.id));
    }

    /**
     * Stores the caller's dApp as pending and alerts the admins, then approves it when auto-approval is on. An approval that
     * fails is logged and the owner still gets the stored dApp, pending for an admin. An owner may only have one dApp.
     * @param user The owner.
     * @param request The dApp's fields.
     * @returns The new dApp.
     */
    async create(user: SessionUser, request: CreateDappRequest): Promise<DappDto> {
        const dapp = this.dataSource.manager.create(Dapp, { ...request, ownerEmail: user.email, status: DappStatus.PENDING });
        try {
            await this.dataSource.manager.save(dapp);
        } catch (error) {
            if (isOwnerConflict(error)) throw new BusinessException(DappErrorCode.DAPP_ALREADY_EXISTS);
            throw error;
        }
        this.logger.log(`Stored pending dApp ${dapp.id}`);
        this.metrics.countTransition("create", "success");
        await this.alertAdmins({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp });
        if (!this.configService.get<boolean>("admin.autoApprovalEnabled", false)) return DappDto.fromEntity(dapp, null);
        try {
            return await this.approve(dapp.id);
        } catch (error) {
            this.logger.warn(`Auto-approval of dApp ${dapp.id} failed: ${error instanceof Error ? error.message : String(error)}`);
            return DappDto.fromEntity(dapp, null);
        }
    }

    /**
     * Edits the caller's dApp. A pending dApp changes in place, as long as it is still pending when the edit is written. An
     * approved dApp keeps its fields: the edit is stored as a pending change of the fields it changes, replacing the dApp's
     * earlier pending change in one transaction, and the admins are alerted, whether auto-approval is on or not. An edit that
     * sets fields, all to the dApp's live values, deletes the pending change instead and alerts nobody. That transaction
     * locks the dApp and reads it again, so the edit is compared with any change approved since the first read. A rejected dApp
     * changes in place, even when nothing changed, as long as it is still rejected when the edit is written, and goes back to
     * pending for an admin to review, whether auto-approval is on or not: the admins are alerted.
     * @param user The owner.
     * @param id The dApp id.
     * @param request The fields to change.
     * @returns The dApp with its pending change.
     */
    async update(user: SessionUser, id: string, request: UpdateDappRequest): Promise<DappDto> {
        const { manager } = this.dataSource;
        const live = await manager.findOneBy(Dapp, { id, ownerEmail: user.email });
        if (live === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        const changed = changedFields(live, request);
        let dapp = live;
        switch (live.status) {
            case DappStatus.PENDING:
                if (Object.keys(changed).length > 0) dapp = await this.writeWhile(manager, live.id, DappStatus.PENDING, changed);
                this.logger.log(`Updated pending dApp ${live.id}`);
                break;
            case DappStatus.APPROVED: {
                if (DAPP_FIELDS.every((field) => request[field] === undefined)) break;
                const edit = await this.dataSource.transaction(async (transaction) => {
                    const locked = await this.lock(transaction, live.id);
                    const change = changedFields(locked, request);
                    const { affected } = await transaction.delete(DappChange, { dappId: locked.id, status: DappChangeStatus.PENDING });
                    const stored =
                        Object.keys(change).length === 0
                            ? null
                            : await transaction.save(
                                  transaction.create(DappChange, { ...change, dappId: locked.id, status: DappChangeStatus.PENDING }),
                              );
                    return { locked, change, deleted: affected, stored };
                });
                dapp = edit.locked;
                if (edit.stored === null) {
                    if (edit.deleted) this.logger.log(`Deleted the pending change of dApp ${dapp.id}: its owner put the live values back`);
                    break;
                }
                this.logger.log(`Stored pending change ${edit.stored.id} of dApp ${dapp.id}, replacing any earlier one`);
                await this.alertAdmins({ kind: AdminAlertKind.CHANGE_REQUESTED, dapp, change: edit.change });
                break;
            }
            case DappStatus.REJECTED:
                dapp = await this.writeWhile(manager, live.id, DappStatus.REJECTED, {
                    ...changed,
                    status: DappStatus.PENDING,
                    reviewedAt: null,
                });
                this.logger.log(`Resubmitted rejected dApp ${live.id}`);
                this.metrics.countTransition("update", "success");
                await this.alertAdmins({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp });
                return DappDto.fromEntity(dapp, null);
            default:
                throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        }
        this.metrics.countTransition("update", "success");
        return DappDto.fromEntity(dapp, await this.pendingChangeOf(manager, dapp.id));
    }

    /**
     * Approves a pending dApp. Creates its Auth0 client and stores it on the dApp before configuring it with the fields
     * its owner submitted. A step that fails leaves the dApp pending with its client stored, so approving it again reuses
     * that client instead of creating a second one. The approval only lands on a dApp that is still pending and still holds
     * the fields Auth0 got, so a rejection that came first stays, unless the dApp was resubmitted unchanged since, and an owner
     * edit that came first is not approved unsent.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async approve(id: string): Promise<DappDto> {
        const { manager } = this.dataSource;
        const found = await this.findPending(manager, id);
        const { pending, clientId } =
            found.auth0ClientId === null ? await this.createClient(manager, found) : { pending: found, clientId: found.auth0ClientId };
        await this.provisioner.update(clientId, clientOf(pending));
        const dapp = await this.writeWhile(
            manager,
            id,
            DappStatus.PENDING,
            { status: DappStatus.APPROVED, reviewedAt: new Date() },
            holding(pending),
        );
        this.logger.log(`Approved dApp ${dapp.id} with Auth0 client ${dapp.auth0ClientId}`);
        this.metrics.countTransition("approve", "success");
        return DappDto.fromEntity(dapp, null);
    }

    /**
     * Rejects a pending dApp.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async reject(id: string): Promise<DappDto> {
        const { manager } = this.dataSource;
        await this.findPending(manager, id);
        const dapp = await this.writeWhile(manager, id, DappStatus.PENDING, { status: DappStatus.REJECTED, reviewedAt: new Date() });
        this.logger.log(`Rejected dApp ${dapp.id}`);
        this.metrics.countTransition("reject", "success");
        return DappDto.fromEntity(dapp, null);
    }

    /**
     * Approves the dApp's pending change. Checks that the dApp is approved with an Auth0 client, updates that client, which also
     * creates the template's user grants it lacks, and applies the change to the dApp. The approval only lands on a change that
     * is still pending, so a rejection, an owner edit that replaced it or another approval that came first stays. The
     * transaction opens after the Auth0 call, so it holds no connection while Auth0 answers, and leaves the dApp and the change
     * as they were when a step fails, but not the Auth0 client.
     * @param id The dApp id.
     * @returns The dApp with its pending change.
     */
    async approveChange(id: string): Promise<DappDto> {
        const { live, change } = await this.findPendingChange(this.dataSource.manager, id);
        if (live.status !== DappStatus.APPROVED || live.auth0ClientId === null) {
            throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        }
        const changed = fieldsOf(change);
        await this.provisioner.update(live.auth0ClientId, clientOf({ ...live, ...changed }));
        const dapp = await this.dataSource.transaction(async (manager) => {
            await this.lock(manager, live.id);
            const approved = await manager.update(
                DappChange,
                { id: change.id, status: DappChangeStatus.PENDING },
                { status: DappChangeStatus.APPROVED, reviewedAt: new Date() },
            );
            if (approved.affected === 0) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
            await manager.update(Dapp, { id: live.id }, changed);
            return manager.findOneByOrFail(Dapp, { id: live.id });
        });
        this.logger.log(`Approved change ${change.id} of dApp ${dapp.id}`);
        this.metrics.countTransition("approveChange", "success");
        return DappDto.fromEntity(dapp, await this.pendingChangeOf(this.dataSource.manager, dapp.id));
    }

    /**
     * Rejects the dApp's pending change, leaving the dApp as it is. The rejection only lands on a change that is still pending,
     * so an approval that came first stays, and a dApp deleted meanwhile answers as not found.
     * @param id The dApp id.
     * @returns The dApp with its pending change.
     */
    async rejectChange(id: string): Promise<DappDto> {
        const { manager } = this.dataSource;
        const { live, change } = await this.findPendingChange(manager, id);
        const { affected } = await manager.update(
            DappChange,
            { id: change.id, status: DappChangeStatus.PENDING },
            { status: DappChangeStatus.REJECTED, reviewedAt: new Date() },
        );
        if (affected === 0) {
            if ((await manager.findOneBy(Dapp, { id })) === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
            throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        }
        this.logger.log(`Rejected change ${change.id} of dApp ${live.id}`);
        this.metrics.countTransition("rejectChange", "success");
        return DappDto.fromEntity(live, await this.pendingChangeOf(manager, live.id));
    }

    /**
     * Deletes a dApp in any status, with its changes, and alerts the admins. An admin can delete any dApp, anyone else only their
     * own. The dApp's Auth0 client, if any, is left for an admin to delete by hand. The dApp stays locked until it is deleted,
     * so an approval cannot store a client the alert misses, and of two deletes at once only one finds the dApp.
     * @param user The caller.
     * @param id The dApp id.
     */
    async delete(user: SessionUser, id: string): Promise<void> {
        const dapp = await this.dataSource.transaction(async (manager) => {
            const found = await manager.findOne(Dapp, {
                where: user.role === Role.ADMIN ? { id } : { id, ownerEmail: user.email },
                lock: { mode: "pessimistic_write" },
            });
            if (found === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
            await manager.delete(Dapp, { id: found.id });
            return found;
        });
        this.logger.log(`Deleted dApp ${dapp.id}${dapp.auth0ClientId === null ? "" : `, keeping Auth0 client ${dapp.auth0ClientId}`}`);
        this.metrics.countTransition("delete", "success");
        await this.alertAdmins({ kind: AdminAlertKind.DAPP_DELETED, dapp, deletedBy: user.role });
    }

    /**
     * Reads a dApp that waits for review.
     * @param manager The entity manager to read with.
     * @param id The dApp id.
     * @returns The pending dApp.
     */
    private async findPending(manager: EntityManager, id: string): Promise<Dapp> {
        const dapp = await manager.findOneBy(Dapp, { id });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        if (dapp.status !== DappStatus.PENDING) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        return dapp;
    }

    /**
     * Locks a dApp until the transaction ends. Every transaction that writes a dApp's changes locks the dApp first, as a
     * delete does, so the two wait for each other instead of deadlocking.
     * @param manager The entity manager of the transaction.
     * @param id The dApp id.
     * @returns The dApp as stored now.
     */
    private async lock(manager: EntityManager, id: string): Promise<Dapp> {
        const dapp = await manager.findOne(Dapp, { where: { id }, lock: { mode: "pessimistic_write" } });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        return dapp;
    }

    /**
     * Writes columns of a dApp only while it has the status the request read. A request that read the dApp earlier writes just
     * these columns, so it neither undoes a review or resubmission that landed since nor puts back the values it read, nor
     * writes a dApp deleted since.
     * @param manager The entity manager to write with.
     * @param id The dApp id.
     * @param status The status the dApp must still have.
     * @param columns The columns to write.
     * @param unchanged What else the dApp must still match for the write to land.
     * @returns The dApp as stored after the write.
     */
    private async writeWhile(
        manager: EntityManager,
        id: string,
        status: DappStatus,
        columns: Partial<Dapp>,
        unchanged: FindOptionsWhere<Dapp> = {},
    ): Promise<Dapp> {
        const { affected } = await manager.update(Dapp, { ...unchanged, id, status }, columns);
        const dapp = await manager.findOneBy(Dapp, { id });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        if (affected === 0) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        return dapp;
    }

    /**
     * Creates the Auth0 client of a pending dApp and stores it on the dApp. A dApp that got a client, was reviewed or was
     * deleted while Auth0 created this one keeps what it has, and the new client is logged as an orphan. So is one the
     * database failed to store, before the failure is thrown again.
     * @param manager The entity manager to read and write with.
     * @param found The pending dApp, read before the client exists.
     * @returns The dApp as stored now, with any edit that landed meanwhile, and its client.
     */
    private async createClient(manager: EntityManager, found: Dapp): Promise<{ pending: Dapp; clientId: string }> {
        const created = await this.provisioner.create(clientOf(found));
        let affected: number | undefined;
        let pending: Dapp | null;
        try {
            ({ affected } = await manager.update(
                Dapp,
                { id: found.id, status: DappStatus.PENDING, auth0ClientId: IsNull() },
                { auth0ClientId: created },
            ));
            pending = await manager.findOneBy(Dapp, { id: found.id });
        } catch (error) {
            this.logger.warn(`Auth0 client ${created} of dApp ${found.id} may be an orphan: storing it failed`);
            throw error;
        }
        if (pending === null) {
            this.logger.warn(`Auth0 client ${created} of dApp ${found.id} is an orphan: the dApp is deleted`);
            throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        }
        if (affected === 1) {
            this.logger.log(`Created Auth0 client ${created} for pending dApp ${found.id}`);
            return { pending, clientId: created };
        }
        if (pending.status !== DappStatus.PENDING || pending.auth0ClientId === null) {
            this.logger.warn(`Auth0 client ${created} of dApp ${found.id} is an orphan: the dApp is ${pending.status}`);
            throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
        }
        this.logger.warn(
            `Auth0 client ${created} of dApp ${found.id} is an orphan: the dApp already has the client ${pending.auth0ClientId}`,
        );
        return { pending, clientId: pending.auth0ClientId };
    }

    /**
     * Reads a dApp and the change of it that waits for review.
     * @param manager The entity manager to read with.
     * @param id The dApp id.
     * @returns The dApp and its pending change.
     */
    private async findPendingChange(manager: EntityManager, id: string): Promise<{ live: Dapp; change: DappChange }> {
        const live = await manager.findOneBy(Dapp, { id });
        if (live === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        const change = await this.pendingChangeOf(manager, id);
        if (change === null) throw new BusinessException(DappErrorCode.DAPP_CHANGE_NOT_FOUND);
        return { live, change };
    }

    /**
     * Reads the change of a dApp that waits for review.
     * @param manager The entity manager to read with.
     * @param dappId The dApp id.
     * @returns The pending change, or null when there is none.
     */
    private pendingChangeOf(manager: EntityManager, dappId: string): Promise<DappChange | null> {
        return manager.findOneBy(DappChange, { dappId, status: DappChangeStatus.PENDING });
    }

    /**
     * Alerts the admins of a new, changed or deleted dApp, logging instead of throwing when Slack fails, so the write still succeeds.
     * @param alert The alert.
     */
    private async alertAdmins(alert: SlackAlert): Promise<void> {
        try {
            await this.slack.notify(alert);
        } catch (error) {
            this.logger.warn(`Slack alert for dApp ${alert.dapp.id} failed: ${error instanceof Error ? error.name : typeof error}`);
        }
    }
}
