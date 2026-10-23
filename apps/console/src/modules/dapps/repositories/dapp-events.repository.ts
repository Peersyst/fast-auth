import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { DappId } from "../../../domain/dapp";
import type { ActorRole, DappEventDetails } from "../../../domain/dapp-event";
import { isDappEventDetails } from "../../../domain/dapp-event";
import { DappEventEntity } from "../entities/dapp-event.entity";

export type Actor = { email: string | null; role: ActorRole };

export type StoredDappEvent = DappEventDetails & {
    id: string;
    actorEmail: string | null;
    actorRole: ActorRole;
    createdAt: Date;
};

@Injectable()
export class DappEventsRepository {
    private readonly logger = new Logger(DappEventsRepository.name);

    constructor(private readonly dataSource: DataSource) {}

    async append(manager: EntityManager, dappId: DappId, actor: Actor, event: DappEventDetails): Promise<void> {
        await manager.insert(DappEventEntity, {
            dappId,
            type: event.type,
            details: event.details,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
    }

    async listForDapp(dappId: DappId): Promise<StoredDappEvent[]> {
        const rows = await this.dataSource.manager.find(DappEventEntity, {
            select: { id: true, type: true, details: true, actorEmail: true, actorRole: true, createdAt: true },
            where: { dappId },
            order: { seq: "DESC" },
        });
        return rows.flatMap((row) => {
            if (isDappEventDetails(row)) return [row];
            this.logger.warn(`Skipping event ${row.id} of dApp ${dappId}: its details do not match its type ${row.type}`);
            return [];
        });
    }
}
