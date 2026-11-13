import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorator/authenticated.decorator";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { SessionUser } from "../auth/types/session-user";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { DappService } from "./dapp.service";
import { CreateDappRequest } from "./requests/create-dapp.request";
import { ListDappsRequest } from "./requests/list-dapps.request";
import { UpdateDappRequest } from "./requests/update-dapp.request";
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
        description: "For an admin, one page of every dApp. For anyone else, their own dApp, if any.",
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
        description: "The new dApp, `pending` until an admin reviews it, or `approved` with its Auth0 client when auto-approval is on.",
    })
    create(@CurrentUser() user: SessionUser, @Body() request: CreateDappRequest): Promise<DappDto> {
        return this.dappService.create(user, request);
    }

    @Patch(":id")
    @ApiOkResponse({
        type: DappDto,
        description:
            "The dApp. A pending dApp is edited in place. An approved dApp shows the edit in `pendingChange` until it is reviewed.",
    })
    update(@CurrentUser() user: SessionUser, @Param("id", ParseUUIDPipe) id: string, @Body() request: UpdateDappRequest): Promise<DappDto> {
        return this.dappService.update(user, id, request);
    }
}
