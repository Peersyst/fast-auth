import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EntityManager, SelectQueryBuilder } from "typeorm";
import { DataSource, Not } from "typeorm";
import type { Dapp, DappFields, DappId, DappStatus } from "../../../domain/dapp";
import { DappEntity } from "../entities/dapp.entity";

export type DappChanges = Partial<Omit<Dapp, "id" | "version" | "createdAt" | "updatedAt">>;

type NewDapp = DappFields & { ownerEmail: string; submittedAt: Date };

export const DappOrderBy = {
    SubmittedAt: "submittedAt",
    UpdatedAt: "updatedAt",
    Name: "name",
    Status: "status",
} as const;
export type DappOrderBy = (typeof DappOrderBy)[keyof typeof DappOrderBy];

export const SortOrder = { Asc: "asc", Desc: "desc" } as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export type AdminDappFilter = {
    needsReview: boolean;
    status?: DappStatus | undefined;
    q?: string | undefined;
    orderBy?: DappOrderBy | undefined;
    order?: SortOrder | undefined;
};

export type Page = { page: number; pageSize: number };

const ORDER_BY_COLUMN: Record<DappOrderBy, string> = {
    submittedAt: "d.submittedAt",
    updatedAt: "d.updatedAt",
    name: "d.name",
    status: "d.status",
};

const REVIEW_SINCE = "COALESCE(d.pendingChangeAt, d.submittedAt)";

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

@Injectable()
export class DappsRepository {
    constructor(private readonly dataSource: DataSource) {}

    findLiveByOwnerForUpdate(manager: EntityManager, ownerEmail: string): Promise<Dapp | null> {
        return manager.findOne(DappEntity, { where: { ownerEmail, status: Not("removed") }, lock: { mode: "pessimistic_write" } });
    }

    findByIdForUpdate(manager: EntityManager, id: DappId): Promise<Dapp | null> {
        return manager.findOne(DappEntity, { where: { id }, lock: { mode: "pessimistic_write" } });
    }

    findLiveByOwner(ownerEmail: string): Promise<Dapp | null> {
        return this.dataSource.manager.findOne(DappEntity, { where: { ownerEmail, status: Not("removed") } });
    }

    findById(id: DappId): Promise<Dapp | null> {
        return this.dataSource.manager.findOneBy(DappEntity, { id });
    }

    async insert(manager: EntityManager, dapp: NewDapp): Promise<Dapp> {
        const id = randomUUID() as DappId;
        await manager.insert(DappEntity, { ...dapp, id, status: "pending" });
        return manager.findOneByOrFail(DappEntity, { id });
    }

    async update(manager: EntityManager, id: DappId, changes: DappChanges): Promise<Dapp> {
        await manager.update(DappEntity, { id }, changes);
        return manager.findOneByOrFail(DappEntity, { id });
    }

    async setAuth0ErrorKeepingVersion(manager: EntityManager, id: DappId, error: string): Promise<void> {
        await manager.query("UPDATE dapps SET auth0_error = $1 WHERE id = $2", [error, id]);
    }

    async listForAdmin(filter: AdminDappFilter, page: Page): Promise<{ items: Dapp[]; total: number }> {
        const query = this.dataSource.manager.createQueryBuilder(DappEntity, "d");
        if (filter.needsReview) query.andWhere("(d.status = 'pending' OR (d.status = 'approved' AND d.pendingChange IS NOT NULL))");
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

    private orderForAdmin(query: SelectQueryBuilder<DappEntity>, filter: AdminDappFilter): void {
        const direction = filter.order === "desc" ? "DESC" : "ASC";
        if (filter.orderBy !== undefined) query.orderBy(ORDER_BY_COLUMN[filter.orderBy], direction);
        else if (filter.needsReview) query.orderBy(REVIEW_SINCE, direction);
        else query.orderBy(ORDER_BY_COLUMN.submittedAt, direction);
        query.addOrderBy("d.id", direction);
    }
}
