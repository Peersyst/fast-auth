import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { DataSource, Not } from "typeorm";
import type { Dapp, DappFields, DappId } from "../../../domain/dapp";
import { DappEntity } from "../entities/dapp.entity";

export type DappChanges = Partial<Omit<Dapp, "id" | "version" | "createdAt" | "updatedAt">>;

type NewDapp = DappFields & { ownerEmail: string; submittedAt: Date };

@Injectable()
export class DappsRepository {
    constructor(private readonly dataSource: DataSource) {}

    findLiveByOwnerForUpdate(manager: EntityManager, ownerEmail: string): Promise<Dapp | null> {
        return manager.findOne(DappEntity, { where: { ownerEmail, status: Not("removed") }, lock: { mode: "pessimistic_write" } });
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
}
