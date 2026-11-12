import { ApiFactory } from "@frontend/core/data-access/api/factory";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { withSessionRenewal } from "@frontend/console-auth/data-access/api";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { IConsoleAuthApi } from "@frontend/console-auth/domain/interfaces";
import { IConsoleAdminApi } from "@frontend/console-admin/domain/interfaces";
import { IConsoleDappApi } from "@frontend/console-dapp/domain/interfaces";
import { AdminApi, AuthApi, DappApi } from "@shared/console";

declare module "@frontend/core/data-access/api/factory" {
    export interface IApiFactory {
        consoleAuthApi: IConsoleAuthApi;
        consoleDappApi: IConsoleDappApi;
        consoleAdminApi: IConsoleAdminApi;
    }
}

/**
 * Renews the session past the token cache, for a request the console refused.
 * @returns Once the session is renewed.
 */
const renewSession = (): Promise<void> => getInstance(ConsoleAuthController).refreshSession();

ApiFactory.create({
    consoleAuthApi: () => withSessionRenewal(AuthApi, renewSession),
    consoleDappApi: () => withSessionRenewal(DappApi, renewSession),
    consoleAdminApi: () => withSessionRenewal(AdminApi, renewSession),
});

export { ApiFactory } from "@frontend/core/data-access/api/factory";
