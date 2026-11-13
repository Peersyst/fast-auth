import { ControllerFactory } from "@frontend/core/domain/controller/factory";
import { SettingsController } from "@frontend/settings/domain/controllers";
import { ISettingsController } from "@frontend/settings/ui/interfaces";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { IConsoleAuthController } from "@frontend/console-auth/ui/interfaces";
import { ConsoleAdminController } from "@frontend/console-admin/domain/controllers";
import { IConsoleAdminController } from "@frontend/console-admin/ui/interfaces";
import { ConsoleDappController } from "@frontend/console-dapp/domain/controllers";
import { IConsoleDappController } from "@frontend/console-dapp/ui/interfaces";
import { StateManager } from "../state/state.manager";
import { ApiFactory } from "../../data-access/factories/api.factory";
import { RepositoryFactory } from "../../data-access/factories/repository.factory";
import { ServiceFactory } from "../../data-access/factories/service.factory";

declare module "@frontend/core/domain/controller/factory" {
    export interface IControllerFactory {
        settingsController: ISettingsController;
        consoleAuthController: IConsoleAuthController;
        consoleDappController: IConsoleDappController;
        consoleAdminController: IConsoleAdminController;
    }
}

ControllerFactory.create({
    settingsController: () => new SettingsController(RepositoryFactory.settingsRepository, StateManager.states.settings),
    consoleAuthController: () => new ConsoleAuthController(ApiFactory.consoleAuthApi, ServiceFactory.auth0Service),
    consoleDappController: () => new ConsoleDappController(ApiFactory.consoleDappApi),
    consoleAdminController: () => new ConsoleAdminController(ApiFactory.consoleAdminApi),
});

export { ControllerFactory } from "@frontend/core/domain/controller/factory";
