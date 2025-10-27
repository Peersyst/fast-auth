import { Body, Controller, Post } from "@nestjs/common";
import { RelayerService } from "./relayer.service";
import { SignRequest, validate } from "./requests/sign.request";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { ApiOperation } from "@nestjs/swagger";
import { SignResponse } from "./response/sign.response";
import { SignAndSendDelegateActionRequest } from "./requests/sign-and-send-delegate-action.request";
import { CreateAccountRequest } from "./requests/create-account.request";

@ApiTags("fast-auth-relayer")
@Controller("relayer/fast-auth")
export class RelayerController {
    constructor(private readonly fastAuthRelayerService: RelayerService) {}

    @Post()
    @ApiOperation({ summary: "Sign" })
    @ApiBody({ type: SignRequest })
    async sign(@Body() body: SignRequest): Promise<SignResponse> {
        validate(body);
        return this.fastAuthRelayerService.signFastAuthRequest(body);
    }

    @Post()
    @ApiOperation({ summary: "Sign and send a delegate action request" })
    @ApiBody({ type: SignAndSendDelegateActionRequest })
    async signAndSendDelegateAction(@Body() body: SignAndSendDelegateActionRequest): Promise<SignResponse> {
        validate(body);
        return this.fastAuthRelayerService.signAndSendDelegateAction(body);
    }

    @Post()
    @ApiOperation({ summary: "Create account" })
    @ApiBody({ type: CreateAccountRequest })
    async createAccount(@Body() body: CreateAccountRequest): Promise<SignResponse> {
        return this.fastAuthRelayerService.createAccount(body);
    }
}
