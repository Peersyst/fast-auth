import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { DataSource, Not } from "typeorm";
import type { Dapp, DappFields, DappId } from "@shared/console-domain/dapp";
import { DappStatus } from "@shared/console-domain/dapp";
import { DappEntity } from "../entities/dapp.entity";

export type DappChanges = Partial<Omit<Dapp, "id" | "version" | "createdAt" | "updatedAt">>;

type NewDapp = DappFields & { ownerEmail: string; submittedAt: Date };

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
}
