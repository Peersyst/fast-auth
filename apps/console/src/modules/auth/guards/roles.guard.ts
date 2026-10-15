import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { ConsoleException } from "../../common/exception/console.exception";
import type { AuthenticatedRequest, Role } from "../session-user";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
        if (!roles) return true;

        if (!roles.includes(context.switchToHttp().getRequest<AuthenticatedRequest>().user.role))
            throw new ConsoleException("FORBIDDEN_ROLE");
        return true;
    }
}
