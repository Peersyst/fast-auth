import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { DappId } from "../../domain/dapp";
import type { SessionUser } from "../auth/session-user";
import { EditDappThrottle, SubmitDappThrottle } from "../auth/throttle-limits";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { DappsService } from "./dapps.service";
import { ExpectedVersionRequest } from "./requests/expected-version.request";
import { toDappFields, UpdateDappRequest, UpsertDappRequest } from "./requests/upsert-dapp.request";
import { MyDappResponse, OwnerDappResponse, toOwnerDappResponse } from "./response/owner-dapp.response";

@ApiTags("dapp")
@ApiBearerAuth()
@ApiErrorResponses()
@Controller("dapp")
export class DappsController {
    constructor(private readonly dapps: DappsService) {}

    @Get()
    @ApiOkResponse({ type: MyDappResponse })
    async getMine(@CurrentUser() user: SessionUser): Promise<MyDappResponse> {
        const dapp = await this.dapps.findOwn(user);
        return { dapp: dapp && toOwnerDappResponse(dapp) };
    }

    @Post()
    @SubmitDappThrottle()
    @ApiCreatedResponse({
        type: OwnerDappResponse,
        description:
            "The new dApp. Its status is `pending` until an admin reviews it, or `approved` with an Auth0 client when auto-approval approved it.",
    })
    async submit(@CurrentUser() user: SessionUser, @Body() body: UpsertDappRequest): Promise<OwnerDappResponse> {
        return toOwnerDappResponse(await this.dapps.submit(user, toDappFields(body)));
    }

    @Put(":id")
    @EditDappThrottle()
    @ApiOkResponse({ type: OwnerDappResponse })
    async edit(
        @CurrentUser() user: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: UpdateDappRequest,
    ): Promise<OwnerDappResponse> {
        return toOwnerDappResponse(await this.dapps.editOwn(user, id, body.expectedVersion, toDappFields(body)));
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @EditDappThrottle()
    @ApiNoContentResponse()
    async remove(
        @CurrentUser() user: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Query() query: ExpectedVersionRequest,
    ): Promise<void> {
        await this.dapps.removeOwn(user, id, query.expectedVersion);
    }
}
