import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import type { DappId } from "../../domain/dapp";
import { Role } from "../auth/session-user";
import type { SessionUser } from "../auth/session-user";
import { AdminMutationThrottle } from "../auth/throttle-limits";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { DappsService } from "../dapps/dapps.service";
import { ExpectedVersionRequest } from "../dapps/requests/expected-version.request";
import { toDappFields, UpdateDappRequest } from "../dapps/requests/upsert-dapp.request";
import { ChangeOwnerRequest } from "./requests/change-owner.request";
import { DEFAULT_PAGE_SIZE, ListDappsRequest } from "./requests/list-dapps.request";
import { ReasonRequest } from "./requests/reason.request";
import { AdminDappResponse, toAdminDappResponse } from "./response/admin-dapp.response";
import { DAPP_EVENT_SCHEMAS, toDappEventResponse } from "./response/dapp-event.response";
import type { DappEventResponse } from "./response/dapp-event.response";
import { PaginatedDappsResponse } from "./response/paginated-dapps.response";

@ApiTags("admin")
@ApiBearerAuth()
@ApiErrorResponses()
@Roles(Role.Admin)
@Controller("admin/dapps")
export class AdminController {
    constructor(private readonly dapps: DappsService) {}

    @Get()
    @ApiOkResponse({ type: PaginatedDappsResponse })
    async list(@Query() query: ListDappsRequest): Promise<PaginatedDappsResponse> {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
        const { items, total } = await this.dapps.list(
            { needsReview: query.needsReview ?? false, status: query.status, q: query.q, orderBy: query.orderBy, order: query.order },
            { page, pageSize },
        );
        return { items: items.map(toAdminDappResponse), total, page, pageSize };
    }

    @Get(":id")
    @ApiOkResponse({ type: AdminDappResponse })
    async get(@Param("id", ParseUUIDPipe) id: DappId): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.get(id));
    }

    @Put(":id")
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async edit(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: UpdateDappRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.adminEdit(admin, id, body.expectedVersion, toDappFields(body)));
    }

    @Post(":id/approve")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async approve(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ExpectedVersionRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.approve(admin, id, body.expectedVersion));
    }

    @Post(":id/reject")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async reject(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ReasonRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.reject(admin, id, body.expectedVersion, body.reason));
    }

    @Post(":id/change/approve")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async approveChange(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ExpectedVersionRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.approveChange(admin, id, body.expectedVersion));
    }

    @Post(":id/change/reject")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async rejectChange(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ReasonRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.rejectChange(admin, id, body.expectedVersion, body.reason));
    }

    @Post(":id/owner")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async changeOwner(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ChangeOwnerRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.changeOwner(admin, id, body.expectedVersion, body.ownerEmail));
    }

    @Post(":id/remove")
    @HttpCode(HttpStatus.OK)
    @AdminMutationThrottle()
    @ApiOkResponse({ type: AdminDappResponse })
    async remove(
        @CurrentUser() admin: SessionUser,
        @Param("id", ParseUUIDPipe) id: DappId,
        @Body() body: ReasonRequest,
    ): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.adminRemove(admin, id, body.expectedVersion, body.reason));
    }

    @Get(":id/events")
    @ApiExtraModels(...DAPP_EVENT_SCHEMAS)
    @ApiOkResponse({ schema: { type: "array", items: { oneOf: DAPP_EVENT_SCHEMAS.map((schema) => ({ $ref: getSchemaPath(schema) })) } } })
    async listEvents(@Param("id", ParseUUIDPipe) id: DappId): Promise<DappEventResponse[]> {
        return (await this.dapps.listEvents(id)).map(toDappEventResponse);
    }
}
