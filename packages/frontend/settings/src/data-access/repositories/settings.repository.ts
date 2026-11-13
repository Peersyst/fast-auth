import { IStorage, StorageRepository, Repository } from "@frontend/core/data-access/repository";
import { Theme, Settings } from "../../common";
import { ISettingsRepository } from "../../domain/interfaces";

@Repository()
export class SettingsRepository extends StorageRepository<Settings> implements ISettingsRepository {
    constructor(storage: IStorage<Settings>) {
        super("settings", storage);
    }

    /**
     * @inheritdoc
     */
    getSettings(): Promise<Settings | undefined> {
        return this.get();
    }

    /**
     * @inheritdoc
     */
    async setTheme(theme: Theme): Promise<void> {
        return this.set({ theme });
    }
}
