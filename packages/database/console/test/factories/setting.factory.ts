import { EntityManager } from "typeorm";
import { AUTO_APPROVAL_SETTING, Setting } from "../../src/entities/setting";

/**
 * Stores the auto-approval switch, as the initial migration does, since truncating the tables removes it.
 * @param em The TypeORM EntityManager.
 * @param enabled Whether auto-approval is on.
 * @returns The persisted Setting entity.
 */
export async function createAutoApprovalSetting(em: EntityManager, enabled = false): Promise<Setting> {
    return em.save(Setting, em.create(Setting, { key: AUTO_APPROVAL_SETTING, value: { enabled } }));
}
