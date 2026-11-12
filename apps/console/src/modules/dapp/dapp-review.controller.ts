import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthenticated } from "../auth/decorator/authenticated.decorator";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { DappService } from "./dapp.service";
import { DappDto } from "./dtos/dapp.dto";

@ApiTags("dapp")
@ApiErrorDecorators()
@AdminAuthenticated()
@Controller("dapp")
export class DappReviewController {
    constructor(private readonly dappService: DappService) {}

    @Post(":id/approve")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: DappDto,
        description: "The dApp, `approved` with its new Auth0 client, or still `pending` with `auth0Error` when the Auth0 call failed.",
    })
    approve(@Param("id", ParseUUIDPipe) id: string): Promise<DappDto> {
        return this.dappService.approve(id);
    }

    @Post(":id/reject")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: DappDto, description: "The dApp, `rejected`." })
    reject(@Param("id", ParseUUIDPipe) id: string): Promise<DappDto> {
        return this.dappService.reject(id);
    }
}
