import { Controller, Get, Inject, Query, Redirect } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GoogleAuthService } from "./modules/google/google.service";
import { CustomTokenDto } from "./dtos/custom-token.dto";
import { ValidCustomTokenDto } from "./dtos/valid-custom-token.dto";

@Controller("auth")
export class AuthController {
    constructor(
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(GoogleAuthService) private readonly googleAuthService: GoogleAuthService,
    ) {}

    @Get("google/login")
    @Redirect()
    async login() {
        return { url: this.googleAuthService.getLoginUrl() };
    }

    @Get("google/callback")
    async callback(@Query("code") code: string): Promise<CustomTokenDto> {
        const customToken = await this.authService.createCustomTokenWithGoogle(code);
        return CustomTokenDto.fromString(customToken);
    }

    @Get("google/verify")
    async verify(@Query("token") token: string): Promise<ValidCustomTokenDto> {
        return await this.authService.verifyCustomToken(token);
    }
}
