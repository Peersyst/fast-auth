import { ServiceFactory } from "@frontend/core/data-access/service/factory";
import { IAuth0Service } from "@frontend/console-auth/domain/interfaces";
import { Auth0Service } from "@frontend/console-auth/data-access/services";
import { config } from "../../../config";

declare module "@frontend/core/data-access/service/factory" {
    export interface IServiceFactory {
        auth0Service: IAuth0Service;
    }
}

ServiceFactory.create({
    auth0Service: () => new Auth0Service(config),
});

export { ServiceFactory } from "@frontend/core/data-access/service/factory";
