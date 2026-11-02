import { Injectable, Logger } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import type { DappId } from "@shared/console-domain/dapp";
import type { ActorRole, DappEventDetails } from "@shared/console-domain/dapp-event";
import { isDappEventDetails } from "@shared/console-domain/dapp-event";
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

    /**
     * Inserts one event within the given transaction.
     * @param manager The transaction's entity manager.
     * @param dappId The dApp id.
     * @param actor Who acted.
     * @param event The event type and details.
     */
    async append(manager: EntityManager, dappId: DappId, actor: Actor, event: DappEventDetails): Promise<void> {
        await manager.insert(DappEventEntity, {
            dappId,
            type: event.type,
            details: event.details,
            actorEmail: actor.email,
            actorRole: actor.role,
        });
    }

    /**
     * Lists a dApp's events newest first, skipping and logging any whose details do not match their type.
     * @param dappId The dApp id.
     * @returns The events.
     */
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
