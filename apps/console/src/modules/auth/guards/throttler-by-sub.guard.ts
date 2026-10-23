import type { ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ConsoleException } from "../../common/exception/console.exception";
import type { AuthenticatedRequest } from "../session-user";
import { THROTTLED_KEY } from "../throttle-limits";

@Injectable()
export class ThrottlerBySubGuard extends ThrottlerGuard {
    protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
        return !this.reflector.getAllAndOverride<boolean>(THROTTLED_KEY, [context.getHandler(), context.getClass()]);
    }

    protected override async getTracker(req: AuthenticatedRequest): Promise<string> {
        return req.user.sub;
    }

    protected override async throwThrottlingException(): Promise<void> {
        throw new ConsoleException("RATE_LIMITED");
    }
}
