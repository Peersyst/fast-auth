import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleAuthService {
    constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

    /**
     * Get the login URL for Google OAuth.
     * @returns The login URL.
     */
    getLoginUrl(): string {
        const clientId = this.configService.get("google.clientId");
        const redirectUri = this.configService.get("google.redirectUri");

        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`;
    }

    /**
     * Exchange an auth code for an access token.
     * @param code The auth code.
     * @returns The access token.
     */
    async exchangeAuthCodeForIdToken(code: string): Promise<{ idToken: string; accessToken: string }> {
        const { clientId, clientSecret, redirectUri } = this.configService.get("google");
        const response = await fetch(`https://oauth2.googleapis.com/token`, {
            method: "POST",
            body: JSON.stringify({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        const data = await response.json();
        return { idToken: data.id_token, accessToken: data.access_token };
    }

    /**
     * Get user info from Google.
     * @param accessToken The access token.
     * @returns The user info.
     */
    async getUserInfo(accessToken: string): Promise<any> {
        const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
        return await response.json();
    }
}
