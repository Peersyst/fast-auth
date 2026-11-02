import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ConsoleConfig } from "../../config/console-config";
import { Public } from "../common/decorators/public.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { ClientConfigResponse } from "./responses/client-config.response";

@ApiTags("config")
@ApiErrorResponses()
@Public()
@Controller("config")
export class ClientConfigController {
    constructor(@Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>) {}

    @Get()
    @ApiOkResponse({ type: ClientConfigResponse })
    async getConfig(): Promise<ClientConfigResponse> {
        return ClientConfigResponse.fromAuth0Config(this.configService.get("auth0", { infer: true }));
    }
}
