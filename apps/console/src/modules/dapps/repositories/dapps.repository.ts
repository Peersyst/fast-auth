import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EntityManager, SelectQueryBuilder } from "typeorm";
import { DataSource, Not } from "typeorm";
import type { Dapp, DappFields, DappId } from "@shared/console-domain/dapp";
import { DappStatus } from "@shared/console-domain/dapp";
import { ActorRole } from "@shared/console-domain/dapp-event";
import { DappOrderBy, SortOrder } from "../dapp-order";
import { DappEntity } from "../entities/dapp.entity";

export type DappChanges = Partial<Omit<Dapp, "id" | "version" | "createdAt" | "updatedAt">>;

type NewDapp = DappFields & { ownerEmail: string; submittedAt: Date };

export type AdminDappFilter = {
    needsReview: boolean;
    status?: DappStatus | undefined;
    q?: string | undefined;
    orderBy?: DappOrderBy | undefined;
    order?: SortOrder | undefined;
};

export type Page = { page: number; pageSize: number };

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
export class DappsRepository {
    constructor(private readonly dataSource: DataSource) {}

    /**
     * Finds the owner's dApp that is not removed and locks its row until the transaction ends.
     * @param manager The transaction's entity manager.
     * @param ownerEmail The owner's email.
     * @returns The dApp, or null.
     */
    findLiveByOwnerForUpdate(manager: EntityManager, ownerEmail: string): Promise<Dapp | null> {
        return manager.findOne(DappEntity, { where: { ownerEmail, status: Not(DappStatus.REMOVED) }, lock: { mode: "pessimistic_write" } });
    }

    /**
     * Tells whether the email owns or ever owned a dApp. It also checks the events an owner acted on, because an admin can move a dApp to another owner and ownership alone loses that history.
     * @param manager The transaction's entity manager.
     * @param ownerEmail The owner's email.
     * @returns Whether the email has had a dApp.
     */
    async hasHadDapp(manager: EntityManager, ownerEmail: string): Promise<boolean> {
        const [row]: { found: boolean }[] = await manager.query(
            "SELECT EXISTS (SELECT 1 FROM dapps WHERE owner_email = $1) OR EXISTS (SELECT 1 FROM dapp_events WHERE actor_role = $2 AND actor_email = $1) AS found",
            [ownerEmail, ActorRole.USER],
        );
        return row?.found === true;
    }

    /**
     * Finds a dApp in any status and locks its row until the transaction ends.
     * @param manager The transaction's entity manager.
     * @param id The dApp id.
     * @returns The dApp, or null.
     */
    findByIdForUpdate(manager: EntityManager, id: DappId): Promise<Dapp | null> {
        return manager.findOne(DappEntity, { where: { id }, lock: { mode: "pessimistic_write" } });
    }

    /**
     * Finds the owner's dApp that is not removed.
     * @param ownerEmail The owner's email.
     * @returns The dApp, or null.
     */
    findLiveByOwner(ownerEmail: string): Promise<Dapp | null> {
        return this.dataSource.manager.findOne(DappEntity, { where: { ownerEmail, status: Not(DappStatus.REMOVED) } });
    }

    /**
     * Finds a dApp in any status.
     * @param id The dApp id.
     * @returns The dApp, or null.
     */
    findById(id: DappId): Promise<Dapp | null> {
        return this.dataSource.manager.findOneBy(DappEntity, { id });
    }

    /**
     * Inserts a pending dApp under a new id.
     * @param manager The transaction's entity manager.
     * @param dapp The fields, owner and submission time.
     * @returns The stored dApp, with its database defaults.
     */
    async insert(manager: EntityManager, dapp: NewDapp): Promise<Dapp> {
        const id = randomUUID() as DappId;
        await manager.insert(DappEntity, { ...dapp, id, status: DappStatus.PENDING });
        return manager.findOneByOrFail(DappEntity, { id });
    }

    /**
     * Applies the changes and reads the row back.
     * @param manager The transaction's entity manager.
     * @param id The dApp id.
     * @param changes The columns to change.
     * @returns The updated dApp.
     */
    async update(manager: EntityManager, id: DappId, changes: DappChanges): Promise<Dapp> {
        await manager.update(DappEntity, { id }, changes);
        return manager.findOneByOrFail(DappEntity, { id });
    }

    /**
     * Sets the dApp's Auth0 error with raw SQL, so neither the version nor updated_at changes.
     * @param manager The transaction's entity manager.
     * @param id The dApp id.
     * @param error The error message.
     */
    async setAuth0ErrorKeepingVersion(manager: EntityManager, id: DappId, error: string): Promise<void> {
        await manager.query("UPDATE dapps SET auth0_error = $1 WHERE id = $2", [error, id]);
    }

    /**
     * Lists one page of dApps that match the filters, with the count of every match.
     * @param filter The filters and sort.
     * @param page The page number and size.
     * @returns The page's dApps and the total.
     */
    async listForAdmin(filter: AdminDappFilter, page: Page): Promise<{ items: Dapp[]; total: number }> {
        const query = this.dataSource.manager.createQueryBuilder(DappEntity, "d");
        if (filter.needsReview)
            query.andWhere("(d.status = :pending OR (d.status = :approved AND d.pendingChange IS NOT NULL))", {
                pending: DappStatus.PENDING,
                approved: DappStatus.APPROVED,
            });
        if (filter.status !== undefined) query.andWhere("d.status = :status", { status: filter.status });
        if (filter.q !== undefined) {
            query.andWhere("(d.name ILIKE :q OR d.ownerEmail ILIKE :q OR d.contactEmail ILIKE :q OR d.auth0ClientId ILIKE :q)", {
                q: `%${escapeLike(filter.q)}%`,
            });
        }
        this.orderForAdmin(query, filter);
        const [items, total] = await query
            .skip((page.page - 1) * page.pageSize)
            .take(page.pageSize)
            .getManyAndCount();
        return { items, total };
    }

    /**
     * Sorts by the requested column, else review queues by how long each dApp has waited and other lists by submission time, with the id as the tiebreak.
     * @param query The query to sort.
     * @param filter The filters and sort.
     */
    private orderForAdmin(query: SelectQueryBuilder<DappEntity>, filter: AdminDappFilter): void {
        const direction = filter.order === SortOrder.DESC ? "DESC" : "ASC";
        if (filter.orderBy !== undefined) query.orderBy(ORDER_BY_COLUMN[filter.orderBy], direction);
        else if (filter.needsReview) query.orderBy(REVIEW_SINCE, direction);
        else query.orderBy(ORDER_BY_COLUMN[DappOrderBy.SUBMITTED_AT], direction);
        query.addOrderBy("d.id", direction);
    }
}
