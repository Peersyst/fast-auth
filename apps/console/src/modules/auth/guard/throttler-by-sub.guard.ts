import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { BusinessException } from "../../common/exception/business.exception";
import { ErrorCode } from "../../common/exception/error-codes";
import { AuthenticatedRequest } from "../types/session-user";

@Injectable()
export class ThrottlerBySubGuard extends ThrottlerGuard {
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
        throw new BusinessException(ErrorCode.RATE_LIMITED);
    }
}
