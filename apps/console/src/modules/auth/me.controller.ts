import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { AllowUnverifiedEmail } from "../common/decorators/allow-unverified-email.decorator";
import { MeResponse } from "./response/me.response";
import type { SessionUser } from "./session-user";

@ApiTags("auth")
@ApiBearerAuth()
@ApiErrorResponses()
@Controller("me")
export class MeController {
    @Get()
    @AllowUnverifiedEmail()
    @ApiOkResponse({ type: MeResponse })
    me(@CurrentUser() user: SessionUser): MeResponse {
        return { email: user.email, role: user.role, emailVerified: user.emailVerified };
    }
}
