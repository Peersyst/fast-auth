import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import {
    DAPP_FIELDS,
    DappAction,
    DappEventDetails,
    DappEventType,
    DappStatus,
    diffFields,
    diffSyncedFields,
    syncedFieldsOf,
} from "@shared/modules/dapp";
import { SessionUser } from "../auth/types/session-user";
import { BusinessException } from "../common/exception/business.exception";
import { DappLifecycleService, Effects } from "../dapp/dapp-lifecycle.service";
import { DappNotifier } from "../dapp/dapp.notifier";
import { DappErrorCode } from "../dapp/error/dapp.error-codes";
import { toDappFields, UpdateDappRequest } from "../dapp/requests/upsert-dapp.request";
import { adminActor } from "../dapp/types/actor";
import { ChangeOwnerRequest } from "./requests/change-owner.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
import { ReasonRequest } from "./requests/reason.request";
import { AdminDappDto } from "./dtos/admin-dapp.dto";
import { DappEventDto } from "./dtos/dapp-event.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";
import { DappOrderBy } from "./types/dapp-order";
import { OrderType } from "@shared/utils";

const ORDER_BY_COLUMN: Record<DappOrderBy, string> = {
    [DappOrderBy.SUBMITTED_AT]: "d.submittedAt",
    [DappOrderBy.UPDATED_AT]: "d.updatedAt",
    [DappOrderBy.NAME]: "d.name",
    [DappOrderBy.STATUS]: "d.status",
};

const REVIEW_SINCE = "COALESCE(d.pendingChangeAt, d.submittedAt)";

/**
 * Escapes LIKE wildcards so the value matches literally.
 * @param value The search text.
 * @returns The escaped text.
 */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Dapp) private readonly dappRepository: Repository<Dapp>,
        @InjectRepository(DappEvent) private readonly dappEventRepository: Repository<DappEvent>,
        private readonly lifecycle: DappLifecycleService,
        private readonly notifier: DappNotifier,
    ) {}

    /**
     * Lists one page of dApps that match the filters, with the count of every match. Review queues sort by how long each dApp has waited, other lists by submission time, unless a column is given; the id breaks ties.
     * @param request The filters, sort and page.
     * @returns The page.
     */
    async list(request: ListDappsRequest): Promise<PaginatedDappsDto> {
        const page = request.page ?? 1;
        const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
        const query = this.dappRepository.createQueryBuilder("d");
        if (request.needsReview)
            query.andWhere("(d.status = :pending OR (d.status = :approved AND d.pendingChange IS NOT NULL))", {
                pending: DappStatus.PENDING,
                approved: DappStatus.APPROVED,
            });
        if (request.status !== undefined) query.andWhere("d.status = :status", { status: request.status });
        if (request.q !== undefined) {
            query.andWhere("(d.name ILIKE :q OR d.ownerEmail ILIKE :q OR d.contactEmail ILIKE :q OR d.auth0ClientId ILIKE :q)", {
                q: `%${escapeLike(request.q)}%`,
            });
        }
        const direction = request.order ?? OrderType.ASC;
        if (request.orderBy !== undefined) query.orderBy(ORDER_BY_COLUMN[request.orderBy], direction);
        else if (request.needsReview) query.orderBy(REVIEW_SINCE, direction);
        else query.orderBy(ORDER_BY_COLUMN[DappOrderBy.SUBMITTED_AT], direction);
        query.addOrderBy("d.id", direction);
        const [items, total] = await query
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        return PaginatedDappsDto.fromEntities(items, total, page, pageSize);
    }

    /**
     * Loads a dApp in any status.
     * @param id The dApp id.
     * @returns The dApp.
     */
    async get(id: string): Promise<AdminDappDto> {
        return AdminDappDto.fromEntity(await this.getDapp(id));
    }

    /**
     * Lists a dApp's events newest first.
     * @param id The dApp id.
     * @returns The events.
     */
    async listEvents(id: string): Promise<DappEventDto[]> {
        await this.getDapp(id);
        const events = await this.dappEventRepository.find({ where: { dappId: id }, order: { seq: "DESC" } });
        return events.map((event) => DappEventDto.fromEntity(event));
    }

    /**
     * Approves a pending dApp at the expected version by creating its Auth0 client, or reusing one tagged with its id, then emails the owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The approved dApp.
     */
    async approve(admin: SessionUser, id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.APPROVE, async () => {
            const actor = adminActor(admin);
            const approved = await this.lifecycle.mutate(DappAction.APPROVE, actor, { id }, expectedVersion, (manager, live, next) =>
                this.lifecycle.approveIn(manager, live, next, actor, DappEventType.APPROVED),
            );
            await this.notifier.approved(approved);
            return approved;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Rejects a pending dApp at the expected version, deletes any Auth0 client tagged with its id, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param request The version the admin last read and the reason.
     * @returns The rejected dApp.
     */
    async reject(admin: SessionUser, id: string, { expectedVersion, reason }: ReasonRequest): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.REJECT, async () => {
            const actor = adminActor(admin);
            const rejected = await this.lifecycle.mutate(DappAction.REJECT, actor, { id }, expectedVersion, async (manager, live, next) => {
                const now = new Date();
                const deletion = await this.lifecycle.deleteClient(live, now);
                const updated = await this.lifecycle.update(manager, live.id, {
                    auth0Error: null,
                    ...deletion.columns,
                    status: next,
                    rejectionReason: reason,
                    reviewedAt: now,
                    reviewedBy: admin.email,
                });
                await this.lifecycle.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.REJECTED, details: { reason } },
                    ...deletion.events,
                ]);
                return updated;
            });
            await this.notifier.rejected(rejected, reason);
            return rejected;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Applies an approved dApp's pending change to its fields and Auth0 client at the expected version, then emails the owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The updated dApp.
     */
    async approveChange(admin: SessionUser, id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.APPROVE_CHANGE, async () => {
            const actor = adminActor(admin);
            const changed = await this.lifecycle.mutate(
                DappAction.APPROVE_CHANGE,
                actor,
                { id },
                expectedVersion,
                async (manager, live, next) => {
                    if (live.pendingChange === null) throw new Error(`dApp ${live.id} passed approveChange without a pending change`);
                    const change = live.pendingChange;
                    const sync = await this.lifecycle.syncClient(live, change);
                    const updated = await this.lifecycle.update(manager, live.id, {
                        ...change,
                        status: next,
                        pendingChange: null,
                        pendingChangeAt: null,
                        ...sync.columns,
                    });
                    await this.lifecycle.appendEvents(manager, live.id, actor, [
                        { type: DappEventType.CHANGE_APPROVED, details: { changes: diffSyncedFields(live, change) } },
                        ...sync.events,
                    ]);
                    return updated;
                },
            );
            await this.notifier.changeApproved(changed);
            return changed;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Drops an approved dApp's pending change at the expected version, resyncs its Auth0 client to the live fields, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param request The version the admin last read and the reason.
     * @returns The updated dApp.
     */
    async rejectChange(admin: SessionUser, id: string, { expectedVersion, reason }: ReasonRequest): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.REJECT_CHANGE, async () => {
            const actor = adminActor(admin);
            const unchanged = await this.lifecycle.mutate(
                DappAction.REJECT_CHANGE,
                actor,
                { id },
                expectedVersion,
                async (manager, live, next) => {
                    // Always resync: an approveChange that rolled back after Auth0 accepted the change leaves no auth0Error behind.
                    const sync = await this.lifecycle.syncClient(live, syncedFieldsOf(live));
                    const updated = await this.lifecycle.update(manager, live.id, {
                        status: next,
                        pendingChange: null,
                        pendingChangeAt: null,
                        ...sync.columns,
                    });
                    await this.lifecycle.appendEvents(manager, live.id, actor, [
                        { type: DappEventType.CHANGE_REJECTED, details: { reason } },
                        ...sync.events,
                    ]);
                    return updated;
                },
            );
            await this.notifier.changeRejected(unchanged, reason);
            return unchanged;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Applies an admin's edit at the expected version, syncing an approved dApp's Auth0 client when a synced field changed or the last sync failed, and emails the owner when anything changed.
     * @param admin The admin.
     * @param id The dApp id.
     * @param request The new fields and the version the admin last read.
     * @returns The updated dApp.
     */
    async edit(admin: SessionUser, id: string, request: UpdateDappRequest): Promise<AdminDappDto> {
        const fields = toDappFields(request);
        const dapp = await this.lifecycle.counted(DappAction.ADMIN_EDIT, async () => {
            const actor = adminActor(admin);
            const { edited, changed } = await this.lifecycle.mutate(
                DappAction.ADMIN_EDIT,
                actor,
                { id },
                request.expectedVersion,
                async (manager, live, next) => {
                    const changes = diffFields(DAPP_FIELDS, live, fields);
                    const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
                    const sync: Effects =
                        live.status === DappStatus.APPROVED && (live.auth0Error !== null || diffSyncedFields(live, fields).length > 0)
                            ? await this.lifecycle.syncClient(live, syncedFieldsOf(fields))
                            : { columns: {}, events: [] };
                    const updated = await this.lifecycle.update(manager, live.id, { ...fields, status: next, ...sync.columns });
                    await this.lifecycle.appendEvents(manager, live.id, actor, [...events, ...sync.events]);
                    return { edited: updated, changed: changes.length > 0 };
                },
            );
            if (changed) await this.notifier.editedByAdmin(edited);
            return edited;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Moves a dApp to another owner at the expected version, without emailing either owner.
     * @param admin The admin.
     * @param id The dApp id.
     * @param request The version the admin last read and the new owner's email.
     * @returns The updated dApp.
     */
    async changeOwner(admin: SessionUser, id: string, { expectedVersion, ownerEmail }: ChangeOwnerRequest): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.CHANGE_OWNER, () => {
            const actor = adminActor(admin);
            return this.lifecycle.mutate(DappAction.CHANGE_OWNER, actor, { id }, expectedVersion, async (manager, live, next) => {
                const updated = await this.lifecycle.update(manager, live.id, { status: next, ownerEmail });
                await this.lifecycle.appendEvents(manager, live.id, actor, [{ type: DappEventType.OWNER_CHANGED, details: {} }]);
                return updated;
            });
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Removes a dApp at the expected version, deletes its Auth0 client, then emails the owner the reason.
     * @param admin The admin.
     * @param id The dApp id.
     * @param request The version the admin last read and the reason.
     * @returns The removed dApp.
     */
    async remove(admin: SessionUser, id: string, { expectedVersion, reason }: ReasonRequest): Promise<AdminDappDto> {
        const dapp = await this.lifecycle.counted(DappAction.REMOVE, async () => {
            const actor = adminActor(admin);
            const removed = await this.lifecycle.mutate(DappAction.REMOVE, actor, { id }, expectedVersion, (manager, live, next) =>
                this.lifecycle.removeIn(manager, live, next, actor, reason),
            );
            await this.notifier.removedByAdmin(removed, reason);
            return removed;
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Loads a dApp in any status, or throws DAPP_NOT_FOUND.
     * @param id The dApp id.
     * @returns The dApp.
     */
    private async getDapp(id: string): Promise<Dapp> {
        const dapp = await this.dappRepository.findOneBy({ id });
        if (dapp === null) throw new BusinessException(DappErrorCode.DAPP_NOT_FOUND);
        return dapp;
    }
}
