import { Body, Controller, Get, Inject, Put } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ConsoleConfig } from "../../config/console-config";
import { AdminMutationThrottle } from "../auth/throttle-limits";
import { Role } from "../auth/session-user";
import type { SessionUser } from "../auth/session-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { UpdateSettingsRequest } from "./requests/update-settings.request";
import { SettingsResponse } from "./responses/settings.response";
import { SettingsService } from "./settings.service";

@ApiTags("admin")
@ApiBearerAuth()
@ApiErrorResponses()
@Roles(Role.ADMIN)
@Controller("admin/settings")
export class SettingsController {
    constructor(
        private readonly settings: SettingsService,
        @Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>,
    ) {}

    @Get()
    @ApiOkResponse({
        type: SettingsResponse,
        description:
            "`autoApproval.enabled` says whether new submissions can be approved without an admin, and `autoApproval.dailyCap` the most new submissions it chooses in any 24 hours.",
    })
    async get(): Promise<SettingsResponse> {
        return SettingsResponse.fromSettings(await this.settings.get(), this.configService.get("autoApproval.dailyCap", { infer: true }));
    }

    @Put()
    @AdminMutationThrottle()
    @ApiOkResponse({
        type: SettingsResponse,
        description:
            "The settings after the change. Turning auto-approval on does not approve dApps already pending. Turning it off also leaves pending a chosen submission whose Auth0 calls have not started.",
    })
    async update(@CurrentUser() admin: SessionUser, @Body() body: UpdateSettingsRequest): Promise<SettingsResponse> {
        return SettingsResponse.fromSettings(
            await this.settings.update(body, admin.email),
            this.configService.get("autoApproval.dailyCap", { infer: true }),
        );
    }
}
