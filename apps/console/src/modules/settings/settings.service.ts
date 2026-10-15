import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { AutoApprovalSetting } from "./settings.repository";
import { SettingsRepository } from "./settings.repository";

type Settings = { autoApproval: AutoApprovalSetting };

@Injectable()
export class SettingsService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly settings: SettingsRepository,
    ) {}

    async get(): Promise<Settings> {
        return { autoApproval: await this.settings.findAutoApproval(this.dataSource.manager) };
    }

    async update(settings: Settings, actorEmail: string): Promise<Settings> {
        await this.dataSource.transaction(async (manager) => {
            const current = await this.settings.findAutoApprovalForUpdate(manager);
            if (current.enabled === settings.autoApproval.enabled) return;
            await this.settings.saveAutoApproval(manager, current, settings.autoApproval, actorEmail);
        });
        return this.get();
    }
}
