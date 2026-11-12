import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorator/authenticated.decorator";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { SessionUser } from "../auth/types/session-user";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { DappService } from "./dapp.service";
import { CreateDappRequest } from "./requests/create-dapp.request";
import { ListDappsRequest } from "./requests/list-dapps.request";
import { DappDto } from "./dtos/dapp.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";

@ApiTags("dapp")
@ApiErrorDecorators()
@Authenticated()
@Controller("dapp")
export class DappController {
    constructor(private readonly dappService: DappService) {}

    @Get()
    @ApiOkResponse({
        type: PaginatedDappsDto,
        description: "For an admin, one page of the dApps that match the filters. For anyone else, their own live dApp, if any.",
    })
    list(@CurrentUser() user: SessionUser, @Query() request: ListDappsRequest): Promise<PaginatedDappsDto> {
        return this.dappService.list(user, request);
    }

    @Get(":id")
    @ApiOkResponse({ type: DappDto, description: "The dApp. An admin can read any dApp, anyone else only their own." })
    get(@CurrentUser() user: SessionUser, @Param("id", ParseUUIDPipe) id: string): Promise<DappDto> {
        return this.dappService.get(user, id);
    }

    @Post()
    @ApiCreatedResponse({
        type: DappDto,
        description:
            "The new dApp. Its status is `pending` until it is reviewed, or `approved` with an Auth0 client when auto-approval approved it.",
    })
    create(@CurrentUser() user: SessionUser, @Body() request: CreateDappRequest): Promise<DappDto> {
        return this.dappService.create(user, request);
    }
}
