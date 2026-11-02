import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { ConsoleException } from "../../common/exception/console.exception";
import { ALLOW_UNVERIFIED_EMAIL_KEY } from "../../common/decorators/allow-unverified-email.decorator";
import { AuthErrorCode } from "../error/auth-error-codes";
import type { AuthenticatedRequest } from "../session-user";

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Refuses an unverified email unless the route is public or allows unverified emails.
     * @param context The request context.
     * @returns True once the request may proceed.
     */
    canActivate(context: ExecutionContext): boolean {
        const targets = [context.getHandler(), context.getClass()];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
        if (this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_EMAIL_KEY, targets)) return true;

        if (!context.switchToHttp().getRequest<AuthenticatedRequest>().user.emailVerified)
            throw new ConsoleException(AuthErrorCode.EMAIL_NOT_VERIFIED);
        return true;
    }
}
