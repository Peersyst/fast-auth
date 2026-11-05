import { EntityManager } from "typeorm";
import { ActorRole, DappEventType } from "@shared/modules/dapp";
import { DappEvent } from "../../src/entities/dapp-event";

/**
 * Creates and persists a DappEvent entity with sensible defaults.
 * @param em The TypeORM EntityManager.
 * @param overrides Fields to override on the default entity. `dappId` is required.
 * @returns The persisted DappEvent entity.
 */
export async function createDappEvent(em: EntityManager, overrides: Partial<DappEvent> & Pick<DappEvent, "dappId">): Promise<DappEvent> {
    const entity = em.create(DappEvent, {
        type: DappEventType.SUBMITTED,
        actorEmail: null,
        actorRole: ActorRole.SYSTEM,
        details: { chosenForAutoApproval: false },
        ...overrides,
    });

    return em.save(DappEvent, entity);
}
