import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrorDecorators } from "../common/exception/error-response.decorator";
import { SignedIn } from "./decorator/authenticated.decorator";
import { CurrentUser } from "./decorator/current-user.decorator";
import { MeDto } from "./dtos/me.dto";
import type { SessionUser } from "./types/session-user";

@ApiTags("auth")
@ApiErrorDecorators()
@SignedIn()
@Controller("me")
export class MeController {
    @Get()
    @ApiOkResponse({ type: MeDto })
    async me(@CurrentUser() user: SessionUser): Promise<MeDto> {
        return MeDto.fromUser(user);
    }
}
