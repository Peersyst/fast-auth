import { Controller } from "@frontend/core/domain/controller";
import { DomainError } from "@frontend/core/domain/error";
import { ApiErrors, DefaultError, ServiceErrors } from "@frontend/core/domain/error/decorators";
import { MeDto } from "@shared/console";
import { Session } from "../../common";
import { IConsoleAuthController } from "../../ui/interfaces";
import { Auth0ServiceErrors } from "../../data-access/console-auth.service.errors";
import { ConsoleAuthErrors } from "../console-auth.errors";
import { IAuth0Service, IConsoleAuthApi } from "../interfaces";

const RENEW_BEFORE_EXPIRY_MS = 60_000;

@Controller()
export class ConsoleAuthController implements IConsoleAuthController {
    constructor(
        private readonly consoleAuthApi: IConsoleAuthApi,
        private readonly auth0Service: IAuth0Service,
    ) {}

    /**
     * @inheritdoc
     */
    async getSession(): Promise<Session> {
        if (!(await this.auth0Service.isAuthenticated())) return { isAuthenticated: false };
        return { isAuthenticated: true, email: await this.auth0Service.getEmail() };
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAuthErrors.SIGN_IN_FAILED)
    @ServiceErrors({ [Auth0ServiceErrors.POPUP_BLOCKED]: ConsoleAuthErrors.POPUP_BLOCKED })
    signIn(): Promise<void> {
        return this.auth0Service.loginWithPopup();
    }

    /**
     * @inheritdoc
     */
    continueInTab(returnTo: string): Promise<void> {
        return this.auth0Service.loginWithRedirect(returnTo);
    }

    /**
     * @inheritdoc
     */
    signOut(): Promise<void> {
        return this.auth0Service.logout();
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAuthErrors.SESSION_RENEWAL_FAILED)
    @ServiceErrors({ [Auth0ServiceErrors.SESSION_ENDED]: ConsoleAuthErrors.SESSION_EXPIRED })
    async getIdToken(): Promise<string> {
        let claims = await this.auth0Service.getIdTokenClaims();
        if (!claims || (claims.exp ?? 0) * 1000 - Date.now() < RENEW_BEFORE_EXPIRY_MS) {
            await this.auth0Service.renewTokens();
            claims = await this.auth0Service.getIdTokenClaims();
        }
        if (!claims) throw new DomainError(ConsoleAuthErrors.SESSION_EXPIRED);
        return claims.__raw;
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAuthErrors.SESSION_RENEWAL_FAILED)
    @ServiceErrors({ [Auth0ServiceErrors.SESSION_ENDED]: ConsoleAuthErrors.SESSION_EXPIRED })
    refreshSession(): Promise<void> {
        return this.auth0Service.renewTokens();
    }

    /**
     * @inheritdoc
     */
    @DefaultError(ConsoleAuthErrors.CONSOLE_UNREACHABLE)
    @ApiErrors({
        EMAIL_REQUIRED: ConsoleAuthErrors.EMAIL_REQUIRED,
        401: ConsoleAuthErrors.SESSION_EXPIRED,
        // The console only gets these when it and the API disagree on the route, which the user cannot fix.
        404: ConsoleAuthErrors.SERVER_ERROR,
        405: ConsoleAuthErrors.SERVER_ERROR,
        500: ConsoleAuthErrors.SERVER_ERROR,
    })
    getMe(): Promise<MeDto> {
        return this.consoleAuthApi.me();
    }
}
