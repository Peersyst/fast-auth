import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { AuthenticatedRequest, Role } from "../types/session-user";

@Injectable()
export class AdminGuard implements CanActivate {
    /**
     * Refuses a signed-in user who is not an admin.
     * @param context The request context.
     * @returns True once the request may proceed.
     */
    canActivate(context: ExecutionContext): boolean {
        if (context.switchToHttp().getRequest<AuthenticatedRequest>().user.role !== Role.ADMIN)
            throw new BusinessException(AuthErrorCode.FORBIDDEN_ROLE);
        return true;
    }
}
