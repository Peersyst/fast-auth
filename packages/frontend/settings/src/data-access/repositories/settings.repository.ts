import { IStorage, StorageRepository, Repository } from "@frontend/core/data-access/repository";
import { Locale, Theme, Settings } from "../../common";
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
    async setSettings(settings: Partial<Settings>): Promise<void> {
        const currentSettings = await this.getSettings();
        return this.set({ ...currentSettings, ...settings });
    }

    /**
     * @inheritdoc
     */
    async getLocale(): Promise<Locale | undefined> {
        const settings = await this.getSettings();
        return settings?.locale;
    }

    /**
     * @inheritdoc
     */
    async setLocale(locale: Locale): Promise<void> {
        return this.setSettings({ locale });
    }

    /**
     * @inheritdoc
     */
    async getTheme(): Promise<Theme | undefined> {
        const settings = await this.getSettings();
        return settings?.theme;
    }

    /**
     * @inheritdoc
     */
    async setTheme(theme: Theme): Promise<void> {
        return this.setSettings({ theme });
    }
}
