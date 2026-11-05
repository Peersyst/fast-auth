import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthenticated } from "../auth/decorator/authenticated.decorator";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { Throttled } from "../auth/decorator/throttled.decorator";
import type { SessionUser } from "../auth/types/session-user";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { ExpectedVersionRequest } from "../dapp/requests/expected-version.request";
import { UpdateDappRequest } from "../dapp/requests/upsert-dapp.request";
import { AdminService } from "./admin.service";
import { ChangeOwnerRequest } from "./requests/change-owner.request";
import { ListDappsRequest } from "./requests/list-dapps.request";
import { ReasonRequest } from "./requests/reason.request";
import { AdminDappDto } from "./dtos/admin-dapp.dto";
import { DappEventDto } from "./dtos/dapp-event.dto";
import { PaginatedDappsDto } from "./dtos/paginated-dapps.dto";

@ApiTags("admin")
@ApiErrorDecorators()
@AdminAuthenticated()
@Controller("admin/dapps")
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get()
    @ApiOkResponse({ type: PaginatedDappsDto })
    list(@Query() request: ListDappsRequest): Promise<PaginatedDappsDto> {
        return this.adminService.list(request);
    }

    @Get(":id")
    @ApiOkResponse({ type: AdminDappDto })
    get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminDappDto> {
        return this.adminService.get(id);
    }

    @Put(":id")
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    edit(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: UpdateDappRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.edit(admin, id, request);
    }

    @Post(":id/approve")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    approve(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ExpectedVersionRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.approve(admin, id, request.expectedVersion);
    }

    @Post(":id/reject")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    reject(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ReasonRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.reject(admin, id, request);
    }

    @Post(":id/change/approve")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    approveChange(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ExpectedVersionRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.approveChange(admin, id, request.expectedVersion);
    }

    @Post(":id/change/reject")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    rejectChange(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ReasonRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.rejectChange(admin, id, request);
    }

    @Post(":id/owner")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    changeOwner(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ChangeOwnerRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.changeOwner(admin, id, request);
    }

    @Post(":id/remove")
    @HttpCode(HttpStatus.OK)
    @Throttled("adminMutationPerMinute")
    @ApiOkResponse({ type: AdminDappDto })
    remove(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: string,
        @Body() request: ReasonRequest,
    ): Promise<AdminDappDto> {
        return this.adminService.remove(admin, id, request);
    }

    @Get(":id/events")
    @ApiOkResponse({ type: [DappEventDto] })
    listEvents(@Param("id", ParseUUIDPipe) id: string): Promise<DappEventDto[]> {
        return this.adminService.listEvents(id);
    }
}
