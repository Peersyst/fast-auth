import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthenticated } from "../auth/decorator/authenticated.decorator";
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
        description: "`autoApproval.enabled` says whether new submissions can be approved without an admin.",
    })
    get(): SettingsDto {
        return this.settingService.get();
    }

    @Put()
    @ApiOkResponse({
        type: SettingsDto,
        description:
            "The settings after the change. Turning auto-approval on does not approve dApps already pending. Turning it off also leaves pending a chosen submission whose Auth0 calls have not started.",
    })
    update(@Body() request: UpdateSettingsRequest): SettingsDto {
        return this.settingService.update(request);
    }
}
