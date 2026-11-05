import { EntityManager } from "typeorm";
import { DappStatus, MauBracket } from "@shared/modules/dapp";
import { Dapp } from "../../src/entities/dapp";

let dappCounter = 0;

/**
 * Creates and persists a Dapp entity with sensible defaults.
 * @param em The TypeORM EntityManager.
 * @param overrides Fields to override on the default entity.
 * @returns The persisted Dapp entity.
 */
export async function createDapp(em: EntityManager, overrides: Partial<Dapp> = {}): Promise<Dapp> {
    dappCounter++;

    const entity = em.create(Dapp, {
        ownerEmail: `owner-${dappCounter}@owners.test`,
        name: `Acme ${dappCounter}`,
        description: "A wallet",
        logoUrl: `https://cdn.acme-${dappCounter}.xyz/logo.png`,
        mauBracket: MauBracket.LT_1K,
        callbackUrls: [`https://acme-${dappCounter}.xyz/callback`],
        logoutUrls: [],
        webOrigins: [`https://acme-${dappCounter}.xyz`],
        contactEmail: `dev@acme-${dappCounter}.xyz`,
        status: DappStatus.PENDING,
        submittedAt: new Date(),
        ...overrides,
    });

    return em.save(Dapp, entity);
}

/**
 * Resets the dApp factory counter. Call in beforeEach to get predictable values.
 */
export function resetDappFactory(): void {
    dappCounter = 0;
}
