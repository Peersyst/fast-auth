import type { ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CommonErrorCode } from "../../common/exception/common-error-codes";
import { ConsoleException } from "../../common/exception/console.exception";
import type { AuthenticatedRequest } from "../session-user";
import type { ThrottleLimit } from "../throttle-limits";
import { THROTTLE_LIMIT_KEY } from "../throttle-limits";

@Injectable()
export class ThrottlerBySubGuard extends ThrottlerGuard {
    /**
     * Skips every route without a throttle decorator from throttle-limits.ts.
     * @param context The request context.
     * @returns True when the route is not throttled.
     */
    protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
        return !this.reflector.getAllAndOverride<ThrottleLimit | undefined>(THROTTLE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    }

    /**
     * Counts requests per Auth0 subject instead of per IP.
     * @param req The authenticated request.
     * @returns The subject.
     */
    protected override async getTracker(req: AuthenticatedRequest): Promise<string> {
        return req.user.sub;
    }

    /**
     * Refuses with the RATE_LIMITED envelope instead of the throttler's own error.
     */
    protected override async throwThrottlingException(): Promise<void> {
        throw new ConsoleException(CommonErrorCode.RATE_LIMITED);
    }
}
