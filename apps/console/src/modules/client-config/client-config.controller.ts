import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ConsoleConfig } from "../../config/console-config";
import { CONSOLE_CONFIG } from "../../config/console-config";
import { Public } from "../common/decorators/public.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { ClientConfigResponse } from "./response/client-config.response";

@ApiTags("config")
@ApiErrorResponses()
@Public()
@Controller("config")
export class ClientConfigController {
    constructor(@Inject(CONSOLE_CONFIG) private readonly config: ConsoleConfig) {}

    @Get()
    @ApiOkResponse({ type: ClientConfigResponse })
    getConfig(): ClientConfigResponse {
        return {
            auth0Domain: this.config.auth0.loginDomain,
            auth0ClientId: this.config.auth0.consoleClientId,
            nearNetwork: this.config.auth0.nearNetwork,
        };
    }
}
