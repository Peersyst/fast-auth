import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { DappId } from "@shared/console-domain/dapp";
import type { SessionUser } from "../auth/session-user";
import { EditDappThrottle, SubmitDappThrottle } from "../auth/throttle-limits";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { DappsService } from "./dapps.service";
import { ExpectedVersionRequest } from "./requests/expected-version.request";
import { toDappFields, UpdateDappRequest, UpsertDappRequest } from "./requests/upsert-dapp.request";
import { MyDappResponse, OwnerDappResponse } from "./responses/owner-dapp.response";

@ApiTags("dapp")
@ApiBearerAuth()
@ApiErrorResponses()
@Controller("dapp")
export class DappsController {
    constructor(private readonly dapps: DappsService) {}

    @Get()
    @ApiOkResponse({ type: MyDappResponse })
    async getMine(@CurrentUser() user: SessionUser): Promise<MyDappResponse> {
        return MyDappResponse.fromDapp(await this.dapps.findOwn(user));
    }

    @Post()
    @SubmitDappThrottle()
    @ApiCreatedResponse({ type: OwnerDappResponse })
    async submit(@CurrentUser() user: SessionUser, @Body() body: UpsertDappRequest): Promise<OwnerDappResponse> {
        return OwnerDappResponse.fromDapp(await this.dapps.submit(user, toDappFields(body)));
    }

    @Put(":id")
    @EditDappThrottle()
    @ApiOkResponse({ type: OwnerDappResponse })
    async edit(
        @CurrentUser() user: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: UpdateDappRequest,
    ): Promise<OwnerDappResponse> {
        return OwnerDappResponse.fromDapp(await this.dapps.editOwn(user, id, body.expectedVersion, toDappFields(body)));
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
