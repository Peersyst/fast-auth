import { Injectable } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { SettingEventEntity } from "./entities/setting-event.entity";
import { SettingEntity } from "./entities/setting.entity";

export type AutoApprovalSetting = { enabled: boolean };

const AUTO_APPROVAL_KEY = "auto_approval";

function toAutoApproval(row: SettingEntity): AutoApprovalSetting {
    return { enabled: row.value.enabled === true };
}

@Injectable()
export class SettingsRepository {
    async findAutoApproval(manager: EntityManager): Promise<AutoApprovalSetting> {
        return toAutoApproval(await manager.findOneByOrFail(SettingEntity, { key: AUTO_APPROVAL_KEY }));
    }

    async findAutoApprovalForUpdate(manager: EntityManager): Promise<AutoApprovalSetting> {
        return toAutoApproval(
            await manager.findOneOrFail(SettingEntity, { where: { key: AUTO_APPROVAL_KEY }, lock: { mode: "pessimistic_write" } }),
        );
    }

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
