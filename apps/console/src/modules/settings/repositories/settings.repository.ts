import { Injectable } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { SettingEventEntity } from "../entities/setting-event.entity";
import { SettingEntity } from "../entities/setting.entity";

export type AutoApprovalSetting = { enabled: boolean };

const AUTO_APPROVAL_KEY = "auto_approval";

/**
 * Reads the auto-approval switch from its row, treating any value but true as off.
 * @param row The setting row.
 * @returns The switch.
 */
function toAutoApproval(row: SettingEntity): AutoApprovalSetting {
    return { enabled: row.value.enabled === true };
}

@Injectable()
export class SettingsRepository {
    /**
     * Reads the auto-approval switch without locking its row.
     * @param manager The entity manager to read with.
     * @returns The switch.
     */
    async findAutoApproval(manager: EntityManager): Promise<AutoApprovalSetting> {
        return toAutoApproval(await manager.findOneByOrFail(SettingEntity, { key: AUTO_APPROVAL_KEY }));
    }

    /**
     * Reads the auto-approval switch and locks its row until the transaction ends.
     * @param manager The transaction's entity manager.
     * @returns The switch.
     */
    async findAutoApprovalForUpdate(manager: EntityManager): Promise<AutoApprovalSetting> {
        return toAutoApproval(
            await manager.findOneOrFail(SettingEntity, { where: { key: AUTO_APPROVAL_KEY }, lock: { mode: "pessimistic_write" } }),
        );
    }

    /**
     * Stores the new switch and records the change with the admin's email.
     * @param manager The transaction's entity manager.
     * @param oldValue The switch before the change.
     * @param newValue The switch after the change.
     * @param actorEmail The admin's email.
     */
    async saveAutoApproval(
        manager: EntityManager,
        oldValue: AutoApprovalSetting,
        newValue: AutoApprovalSetting,
        actorEmail: string,
    ): Promise<void> {
        await manager.update(SettingEntity, { key: AUTO_APPROVAL_KEY }, { value: newValue });
        await manager.insert(SettingEventEntity, { key: AUTO_APPROVAL_KEY, oldValue, newValue, actorEmail });
    }
}
