import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { ClientConfigService } from "./client-config.service";
import { ClientConfigDto } from "./dtos/client-config.dto";

@ApiTags("config")
@ApiErrorDecorators()
@Controller("config")
export class ClientConfigController {
    constructor(private readonly clientConfigService: ClientConfigService) {}

    @Get()
    @ApiOkResponse({ type: ClientConfigDto })
    async getConfig(): Promise<ClientConfigDto> {
        return this.clientConfigService.getConfig();
    }
}
