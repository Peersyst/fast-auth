import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, Equal, FindOptionsWhere, ILike, IsNull, Not, Repository } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import {
    ActorRole,
    DAPP_FIELDS,
    DappAction,
    DappEventDetails,
    DappEventType,
    DappStatus,
    diffFields,
    diffSyncedFields,
    syncedFieldsOf,
} from "@shared/modules/dapp";
import { BusinessException } from "../common/exception/business.exception";
import { DappWriteService, Effects } from "../dapp/dapp-write.service";
import { DappErrorCode } from "../dapp/error/dapp.error-codes";
import { toDappFields, UpdateDappRequest } from "../dapp/requests/upsert-dapp.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
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

const SEARCH_COLUMNS = ["name", "ownerEmail", "contactEmail", "auth0ClientId"] as const;

/**
 * Escapes LIKE wildcards so the value matches literally.
 * @param value The search text.
 * @returns The escaped text.
 */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Reads the pending change of an approved dApp, refusing a dApp in any other status or without one.
 * @param dapp The locked dApp.
 * @returns The pending change.
 */
function pendingChangeOf(dapp: Dapp): NonNullable<Dapp["pendingChange"]> {
    if (dapp.status !== DappStatus.APPROVED) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
    if (dapp.pendingChange === null) throw new BusinessException(DappErrorCode.NO_PENDING_CHANGE);
    return dapp.pendingChange;
}

/**
 * Builds the filters of the admin list. TypeORM ORs the entries of the array and ANDs the fields of each.
 * @param request The filters.
 * @returns The find conditions.
 */
function listFilters({ needsReview, status, search }: ListDappsRequest): FindOptionsWhere<Dapp>[] {
    const withStatus = (wanted: DappStatus): FindOptionsWhere<Dapp>["status"] =>
        status === undefined ? wanted : And(Equal(wanted), Equal(status));
    const scopes: FindOptionsWhere<Dapp>[] = needsReview
        ? [{ status: withStatus(DappStatus.PENDING) }, { status: withStatus(DappStatus.APPROVED), pendingChange: Not(IsNull()) }]
        : [status === undefined ? {} : { status }];
    if (search === undefined) return scopes;
    const pattern = ILike(`%${escapeLike(search)}%`);
    return scopes.flatMap((scope) => SEARCH_COLUMNS.map((column) => ({ ...scope, [column]: pattern })));
}

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Dapp) private readonly dappRepository: Repository<Dapp>,
        @InjectRepository(DappEvent) private readonly dappEventRepository: Repository<DappEvent>,
        private readonly writes: DappWriteService,
    ) {}

    /**
     * Lists one page of dApps that match the filters, with the count of every match. Review queues sort by how long each dApp has waited, other lists by submission time, unless a column is given; the id breaks ties.
     * @param request The filters, sort and page.
     * @returns The page.
     */
    async list(request: ListDappsRequest): Promise<PaginatedDappsDto> {
        const page = request.page ?? 1;
        const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
        const query = this.dappRepository.createQueryBuilder("d").setFindOptions({ where: listFilters(request) });
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
     * Approves a pending dApp at the expected version by creating its Auth0 client, or reusing one tagged with its id.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The approved dApp.
     */
    async approve(id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.writes.counted(DappAction.APPROVE, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.APPROVE, actor, { id }, expectedVersion, (manager, live) =>
                this.writes.approveIn(manager, live, actor, DappEventType.APPROVED),
            );
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Rejects a pending dApp at the expected version, and deletes any Auth0 client tagged with its id.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The rejected dApp.
     */
    async reject(id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.writes.counted(DappAction.REJECT, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.REJECT, actor, { id }, expectedVersion, async (manager, live) => {
                if (live.status !== DappStatus.PENDING) throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
                const now = new Date();
                const deletion = await this.writes.deleteClient(live);
                const updated = await this.writes.update(manager, live.id, {
                    auth0Error: null,
                    ...deletion.columns,
                    status: DappStatus.REJECTED,
                    reviewedAt: now,
                });
                await this.writes.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.REJECTED, details: {} },
                    ...deletion.events,
                ]);
                return updated;
            });
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Applies an approved dApp's pending change to its fields and Auth0 client at the expected version.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The updated dApp.
     */
    async approveChange(id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.writes.counted(DappAction.APPROVE_CHANGE, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.APPROVE_CHANGE, actor, { id }, expectedVersion, async (manager, live) => {
                const change = pendingChangeOf(live);
                const sync = await this.writes.syncClient(live, change);
                const updated = await this.writes.update(manager, live.id, {
                    ...change,
                    pendingChange: null,
                    pendingChangeAt: null,
                    ...sync.columns,
                });
                await this.writes.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.CHANGE_APPROVED, details: { changes: diffSyncedFields(live, change) } },
                    ...sync.events,
                ]);
                return updated;
            });
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Drops an approved dApp's pending change at the expected version and resyncs its Auth0 client to the live fields.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The updated dApp.
     */
    async rejectChange(id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.writes.counted(DappAction.REJECT_CHANGE, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.REJECT_CHANGE, actor, { id }, expectedVersion, async (manager, live) => {
                pendingChangeOf(live);
                // Always resync: an approveChange that rolled back after Auth0 accepted the change leaves no auth0Error behind.
                const sync = await this.writes.syncClient(live, syncedFieldsOf(live));
                const updated = await this.writes.update(manager, live.id, {
                    pendingChange: null,
                    pendingChangeAt: null,
                    ...sync.columns,
                });
                await this.writes.appendEvents(manager, live.id, actor, [
                    { type: DappEventType.CHANGE_REJECTED, details: {} },
                    ...sync.events,
                ]);
                return updated;
            });
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Applies an admin's edit at the expected version, syncing an approved dApp's Auth0 client when a synced field changed or the last sync failed.
     * @param id The dApp id.
     * @param request The new fields and the version the admin last read.
     * @returns The updated dApp.
     */
    async edit(id: string, request: UpdateDappRequest): Promise<AdminDappDto> {
        const fields = toDappFields(request);
        const dapp = await this.writes.counted(DappAction.ADMIN_EDIT, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.ADMIN_EDIT, actor, { id }, request.expectedVersion, async (manager, live) => {
                if (live.status === DappStatus.REMOVED || (live.status === DappStatus.APPROVED && live.pendingChange !== null))
                    throw new BusinessException(DappErrorCode.INVALID_TRANSITION);
                const changes = diffFields(DAPP_FIELDS, live, fields);
                const events: DappEventDetails[] = changes.length > 0 ? [{ type: DappEventType.EDITED, details: { changes } }] : [];
                const sync: Effects =
                    live.status === DappStatus.APPROVED && (live.auth0Error !== null || diffSyncedFields(live, fields).length > 0)
                        ? await this.writes.syncClient(live, syncedFieldsOf(fields))
                        : { columns: {}, events: [] };
                const updated = await this.writes.update(manager, live.id, { ...fields, ...sync.columns });
                await this.writes.appendEvents(manager, live.id, actor, [...events, ...sync.events]);
                return updated;
            });
        });
        return AdminDappDto.fromEntity(dapp);
    }

    /**
     * Removes a dApp at the expected version and deletes its Auth0 client.
     * @param id The dApp id.
     * @param expectedVersion The version the admin last read.
     * @returns The removed dApp.
     */
    async remove(id: string, expectedVersion: number): Promise<AdminDappDto> {
        const dapp = await this.writes.counted(DappAction.REMOVE, () => {
            const actor = ActorRole.ADMIN;
            return this.writes.mutate(DappAction.REMOVE, actor, { id }, expectedVersion, (manager, live) =>
                this.writes.removeIn(manager, live, actor),
            );
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
