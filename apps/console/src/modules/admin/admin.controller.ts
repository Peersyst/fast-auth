import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import type { DappId } from "../../domain/dapp";
import { Role } from "../auth/session-user";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { DappsService } from "../dapps/dapps.service";
import { AdminDappResponse, toAdminDappResponse } from "./response/admin-dapp.response";
import { DAPP_EVENT_SCHEMAS, toDappEventResponse } from "./response/dapp-event.response";
import type { DappEventResponse } from "./response/dapp-event.response";

@ApiTags("admin")
@ApiBearerAuth()
@ApiErrorResponses()
@Roles(Role.Admin)
@Controller("admin/dapps")
export class AdminController {
    constructor(private readonly dapps: DappsService) {}

    @Get(":id")
    @ApiOkResponse({ type: AdminDappResponse })
    async get(@Param("id", ParseUUIDPipe) id: DappId): Promise<AdminDappResponse> {
        return toAdminDappResponse(await this.dapps.get(id));
    }

    @Get(":id/events")
    @ApiExtraModels(...DAPP_EVENT_SCHEMAS)
    @ApiOkResponse({ schema: { type: "array", items: { oneOf: DAPP_EVENT_SCHEMAS.map((schema) => ({ $ref: getSchemaPath(schema) })) } } })
    async listEvents(@Param("id", ParseUUIDPipe) id: DappId): Promise<DappEventResponse[]> {
        return (await this.dapps.listEvents(id)).map(toDappEventResponse);
    }
}
