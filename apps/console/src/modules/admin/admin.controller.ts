import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthenticated } from "../auth/decorator/authenticated.decorator";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { ExpectedVersionRequest } from "../dapp/requests/expected-version.request";
import { UpdateDappRequest } from "../dapp/requests/upsert-dapp.request";
import { AdminService } from "./admin.service";
import { ListDappsRequest } from "./requests/list-dapps.request";
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
    @ApiOkResponse({ type: AdminDappDto })
    edit(@Param("id", ParseUUIDPipe) id: string, @Body() request: UpdateDappRequest): Promise<AdminDappDto> {
        return this.adminService.edit(id, request);
    }

    @Post(":id/approve")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminDappDto })
    approve(@Param("id", ParseUUIDPipe) id: string, @Body() request: ExpectedVersionRequest): Promise<AdminDappDto> {
        return this.adminService.approve(id, request.expectedVersion);
    }

    @Post(":id/reject")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminDappDto })
    reject(@Param("id", ParseUUIDPipe) id: string, @Body() request: ExpectedVersionRequest): Promise<AdminDappDto> {
        return this.adminService.reject(id, request.expectedVersion);
    }

    @Post(":id/change/approve")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminDappDto })
    approveChange(@Param("id", ParseUUIDPipe) id: string, @Body() request: ExpectedVersionRequest): Promise<AdminDappDto> {
        return this.adminService.approveChange(id, request.expectedVersion);
    }

    @Post(":id/change/reject")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminDappDto })
    rejectChange(@Param("id", ParseUUIDPipe) id: string, @Body() request: ExpectedVersionRequest): Promise<AdminDappDto> {
        return this.adminService.rejectChange(id, request.expectedVersion);
    }

    @Post(":id/remove")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminDappDto })
    remove(@Param("id", ParseUUIDPipe) id: string, @Body() request: ExpectedVersionRequest): Promise<AdminDappDto> {
        return this.adminService.remove(id, request.expectedVersion);
    }

    @Get(":id/events")
    @ApiOkResponse({ type: [DappEventDto] })
    listEvents(@Param("id", ParseUUIDPipe) id: string): Promise<DappEventDto[]> {
        return this.adminService.listEvents(id);
    }
}
