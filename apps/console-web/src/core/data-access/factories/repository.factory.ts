import { RepositoryFactory } from "@frontend/core/data-access/repository/factory";
import { storageFor } from "@frontend/core/data-access/repository";
import { browserLocalStorage } from "@frontend/core/data-access/repository/browser";
import { SettingsRepository } from "@frontend/settings/data-access/repositories";
import { Settings } from "@frontend/settings";
import { ISettingsRepository } from "@frontend/settings/domain/interfaces";

declare module "@frontend/core/data-access/repository/factory" {
    export interface IRepositoryFactory {
        settingsRepository: ISettingsRepository;
    }
}

RepositoryFactory.create({
    settingsRepository: () => new SettingsRepository(storageFor<Settings>(browserLocalStorage)),
});

export { RepositoryFactory } from "@frontend/core/data-access/repository/factory";
