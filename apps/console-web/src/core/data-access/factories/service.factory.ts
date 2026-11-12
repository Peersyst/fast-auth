import { ServiceFactory } from "@frontend/core/data-access/service/factory";
import { ILocalizationService } from "@frontend/settings/domain/interfaces";
import { BrowserLocalizationService } from "@frontend/settings/data-access/services/browser";
import { IAuth0Service } from "@frontend/console-auth/domain/interfaces";
import { Auth0Service } from "@frontend/console-auth/data-access/services";
import { configManager } from "../../../config";

declare module "@frontend/core/data-access/service/factory" {
    export interface IServiceFactory {
        localizationService: ILocalizationService;
        auth0Service: IAuth0Service;
    }
}

ServiceFactory.create({
    localizationService: () => new BrowserLocalizationService(),
    auth0Service: () => new Auth0Service(configManager),
});

export { ServiceFactory } from "@frontend/core/data-access/service/factory";
