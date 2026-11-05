import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthenticated } from "../auth/decorator/authenticated.decorator";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { Throttled } from "../auth/decorator/throttled.decorator";
import type { SessionUser } from "../auth/types/session-user";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { UpdateSettingsRequest } from "./requests/update-settings.request";
import { SettingsDto } from "./dtos/settings.dto";
import { SettingService } from "./setting.service";

@ApiTags("setting")
@ApiErrorDecorators()
@AdminAuthenticated()
@Controller("admin/settings")
export class SettingController {
    constructor(private readonly settingService: SettingService) {}

    @Get()
    @ApiOkResponse({
        type: SettingsDto,
        description:
            "`autoApproval.enabled` says whether new submissions can be approved without an admin, and `autoApproval.dailyCap` the most new submissions it chooses in any 24 hours.",
    })
    get(): Promise<SettingsDto> {
        return this.settingService.get();
    }

    @Put()
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({
        type: SettingsDto,
        description:
            "The settings after the change. Turning auto-approval on does not approve dApps already pending. Turning it off also leaves pending a chosen submission whose Auth0 calls have not started.",
    })
    update(@CurrentUser() admin: SessionUser, @Body() request: UpdateSettingsRequest): Promise<SettingsDto> {
        return this.settingService.update(request, admin.email);
    }
}
