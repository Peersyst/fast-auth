import { EntityManager } from "typeorm";
import { DappChangeStatus } from "@shared/modules/dapp";
import { DappChange } from "../../src/entities/dapp-change";

/**
 * Creates and persists a pending DappChange entity that renames the dApp, unless the overrides say otherwise.
 * @param em The TypeORM EntityManager.
 * @param overrides Fields to override on the default entity. `dappId` is required.
 * @returns The persisted DappChange entity.
 */
export async function createDappChange(
    em: EntityManager,
    overrides: Partial<DappChange> & Pick<DappChange, "dappId">,
): Promise<DappChange> {
    const entity = em.create(DappChange, {
        name: "Acme Pay",
        status: DappChangeStatus.PENDING,
        ...overrides,
    });

    return em.save(DappChange, entity);
}
