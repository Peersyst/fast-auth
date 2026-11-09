import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorator/authenticated.decorator";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { SessionUser } from "../auth/types/session-user";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { DappService } from "./dapp.service";
import { ExpectedVersionRequest } from "./requests/expected-version.request";
import { UpdateDappRequest, UpsertDappRequest } from "./requests/upsert-dapp.request";
import { MyDappDto, OwnerDappDto } from "./dtos/owner-dapp.dto";

@ApiTags("dapp")
@ApiErrorDecorators()
@Authenticated()
@Controller("dapp")
export class DappController {
    constructor(private readonly dappService: DappService) {}

    @Get()
    @ApiOkResponse({ type: MyDappDto })
    getMine(@CurrentUser() user: SessionUser): Promise<MyDappDto> {
        return this.dappService.getOwn(user);
    }

    @Post()
    @ApiCreatedResponse({
        type: OwnerDappDto,
        description:
            "The new dApp. Its status is `pending` until an admin reviews it, or `approved` with an Auth0 client when auto-approval approved it.",
    })
    submit(@CurrentUser() user: SessionUser, @Body() request: UpsertDappRequest): Promise<OwnerDappDto> {
        return this.dappService.submit(user, request);
    }

    @Put(":id")
    @ApiOkResponse({ type: OwnerDappDto })
    edit(
        @CurrentUser() user: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: UpdateDappRequest,
    ): Promise<OwnerDappDto> {
        return this.dappService.editOwn(user, id, request);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    remove(
        @CurrentUser() user: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Query() query: ExpectedVersionRequest,
    ): Promise<void> {
        return this.dappService.removeOwn(user, id, query.expectedVersion);
    }
}
