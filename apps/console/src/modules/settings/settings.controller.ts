import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminMutationThrottle } from "../auth/throttle-limits";
import { Role } from "../auth/session-user";
import type { SessionUser } from "../auth/session-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { UpdateSettingsRequest } from "./requests/update-settings.request";
import { SettingsResponse } from "./response/settings.response";
import { SettingsService } from "./settings.service";

@ApiTags("admin")
@ApiBearerAuth()
@ApiErrorResponses()
@Roles(Role.Admin)
@Controller("admin/settings")
export class SettingsController {
    constructor(private readonly settings: SettingsService) {}

    @Get()
    @ApiOkResponse({
        type: SettingsResponse,
        description: "`autoApproval.enabled` says whether new submissions can be approved without an admin.",
    })
    get(): Promise<SettingsResponse> {
        return this.settings.get();
    }

    @Put()
    @AdminMutationThrottle()
    @ApiOkResponse({
        type: SettingsResponse,
        description:
            "The settings after the change. Turning auto-approval on does not approve dApps already pending. Turning it off also leaves pending a chosen submission whose Auth0 calls have not started.",
    })
    update(@CurrentUser() admin: SessionUser, @Body() body: UpdateSettingsRequest): Promise<SettingsResponse> {
        return this.settings.update(body, admin.email);
    }
}
