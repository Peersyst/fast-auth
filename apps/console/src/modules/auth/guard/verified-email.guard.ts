import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { AuthenticatedRequest } from "../types/session-user";

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
    /**
     * Refuses a signed-in user whose email is not verified.
     * @param context The request context.
     * @returns True once the request may proceed.
     */
    canActivate(context: ExecutionContext): boolean {
        if (!context.switchToHttp().getRequest<AuthenticatedRequest>().user.emailVerified)
            throw new BusinessException(AuthErrorCode.EMAIL_NOT_VERIFIED);
        return true;
    }
}
