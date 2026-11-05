import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ThrottleConfig } from "../../../config/throttle.config";
import { ThrottlerBySubGuard } from "../guard/throttler-by-sub.guard";

export const THROTTLE_LIMIT_KEY = "console:throttle-limit";

/**
 * Limits the route per Auth0 subject to the requests per minute the given throttle setting holds. Goes after the class's
 * authentication decorator, so the subject is known.
 * @param limit The throttle setting.
 * @returns The decorator.
 */
export function Throttled(limit: keyof ThrottleConfig): MethodDecorator {
    return applyDecorators(SetMetadata(THROTTLE_LIMIT_KEY, limit), UseGuards(ThrottlerBySubGuard));
}
