import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest, SessionUser } from "../types/session-user";

export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): SessionUser => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
