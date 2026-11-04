import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import type { DappId } from "@shared/console-domain/dapp";
import { Role } from "../auth/session-user";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { DappsService } from "../dapps/dapps.service";
import { AdminDappResponse } from "./responses/admin-dapp.response";
import { DAPP_EVENT_SCHEMAS, DappEventResponse } from "./responses/dapp-event.response";

@ApiTags("admin")
@ApiBearerAuth()
@ApiErrorResponses()
@Roles(Role.ADMIN)
@Controller("admin/dapps")
export class AdminController {
    constructor(private readonly dapps: DappsService) {}

    @Get(":id")
    @ApiOkResponse({ type: AdminDappResponse })
    async get(@Param("id", ParseUUIDPipe) id: DappId): Promise<AdminDappResponse> {
        return AdminDappResponse.fromDapp(await this.dapps.get(id));
    }

    @Get(":id/events")
    @ApiExtraModels(...DAPP_EVENT_SCHEMAS)
    @ApiOkResponse({ schema: { type: "array", items: { oneOf: DAPP_EVENT_SCHEMAS.map((schema) => ({ $ref: getSchemaPath(schema) })) } } })
    async listEvents(@Param("id", ParseUUIDPipe) id: DappId): Promise<DappEventResponse[]> {
        return (await this.dapps.listEvents(id)).map((event) => DappEventResponse.fromEvent(event));
    }
}
