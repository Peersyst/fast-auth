import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { AutoApprovalSetting } from "./repositories/settings.repository";
import { SettingsRepository } from "./repositories/settings.repository";

export type Settings = { autoApproval: AutoApprovalSetting };

@Injectable()
export class SettingsService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly settings: SettingsRepository,
    ) {}

    /**
     * Reads the current settings.
     * @returns The settings.
     */
    async get(): Promise<Settings> {
        return { autoApproval: await this.settings.findAutoApproval(this.dataSource.manager) };
    }

    /**
     * Applies the settings under a row lock, recording a change only when the value differs, then reads them back.
     * @param settings The new settings.
     * @param actorEmail The admin's email.
     * @returns The settings after the change.
     */
    async update(settings: Settings, actorEmail: string): Promise<Settings> {
        await this.dataSource.transaction(async (manager) => {
            const current = await this.settings.findAutoApprovalForUpdate(manager);
            if (current.enabled === settings.autoApproval.enabled) return;
            await this.settings.saveAutoApproval(manager, current, settings.autoApproval, actorEmail);
        });
        return this.get();
    }
}
