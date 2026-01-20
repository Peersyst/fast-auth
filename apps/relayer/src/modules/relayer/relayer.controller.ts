import { Body, Controller, Inject, Post } from "@nestjs/common";
import { RelayerService } from "./relayer.service";
import { SignRequest, validate } from "./requests/sign.request";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { ApiOperation } from "@nestjs/swagger";
import { SignResponse } from "./response/sign.response";
import { SignAndSendDelegateActionRequest } from "./requests/sign-and-send-delegate-action.request";
import { CreateAccountRequest } from "./requests/create-account.request";
import { ConfigService } from "@nestjs/config";

@ApiTags("fast-auth-relayer")
@Controller("relayer/fast-auth")
export class RelayerController {
    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        private readonly fastAuthRelayerService: RelayerService,
    ) {}

    private validateRequest(body: any): void {
        const guardId = this.configService.get("near.guardId") as string;
        const issuer = this.configService.get("near.issuer") as string;
        validate(body, guardId, issuer);
    }

    @Post("/sign-tx")
    @ApiOperation({ summary: "Sign" })
    @ApiBody({ type: SignRequest })
    async sign(@Body() body: SignRequest): Promise<SignResponse> {
        this.validateRequest(body);
        return this.fastAuthRelayerService.signFastAuthRequest(body);
    }

    @Post("/sign-delegate-tx")
    @ApiOperation({ summary: "Sign and send a delegate action request" })
    @ApiBody({ type: SignAndSendDelegateActionRequest })
    async signAndSendDelegateAction(@Body() body: SignAndSendDelegateActionRequest): Promise<SignResponse> {
        this.validateRequest(body);
        return this.fastAuthRelayerService.signAndSendDelegateAction(body);
    }

    @Post("/create-account")
    @ApiOperation({ summary: "Create account" })
    @ApiBody({ type: CreateAccountRequest })
    async createAccount(@Body() body: CreateAccountRequest): Promise<SignResponse> {
        return this.fastAuthRelayerService.createAccount(body);
    }
}
