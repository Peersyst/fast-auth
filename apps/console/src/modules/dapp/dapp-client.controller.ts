import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { DappService } from "./dapp.service";
import { DappClientDto } from "./dtos/dapp-client.dto";
import { DappClientRequest } from "./requests/dapp-client.request";

/** Public, unlike `DappController`, whose class-level guard would apply to this route too. */
@ApiTags("dapp")
@ApiErrorDecorators()
@Controller("dapp/client")
export class DappClientController {
    constructor(private readonly dappService: DappService) {}

    @Get()
    @ApiOkResponse({
        type: DappClientDto,
        description: "The Auth0 client of the oldest approved dApp that lists the origin as a web origin. 404 when there is none.",
    })
    findClient(@Query() { origin }: DappClientRequest): Promise<DappClientDto> {
        return this.dappService.findClientByOrigin(origin);
    }
}
