import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { AuthenticatedRequest, SessionUser } from "../../auth/session-user";

export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): SessionUser => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
