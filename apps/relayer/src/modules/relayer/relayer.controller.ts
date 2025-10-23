import { Body, Controller, Post } from "@nestjs/common";
import { RelayerService } from "./relayer.service";
import {SignRequest, validate} from "./requests/sign.request";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { ApiOperation } from "@nestjs/swagger";

@ApiTags("fast-auth-relayer")
@Controller("relayer/fast-auth")
export class RelayerController {
    constructor(private readonly fastAuthRelayerService: RelayerService) {}

    @Post()
    @ApiOperation({ summary: "Sign" })
    @ApiBody({ type: SignRequest })
    async sign(@Body() body: SignRequest): Promise<string> {
        validate(body);
        return this.fastAuthRelayerService.sign(body);
    }
}
