import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Auth0Config } from "../../config/auth0.config";
import { TokenSet } from "./broker.types";

/** Redeems Auth0's authorization codes with the broker's client secret. */
@Injectable()
export class Auth0TokenClient {
    private readonly auth0: Auth0Config;

    constructor(config: ConfigService) {
        this.auth0 = config.getOrThrow<Auth0Config>("auth0");
    }

    /**
     * Exchanges an authorization code for the tokens.
     * @param code The code Auth0 sent to the broker's callback.
     * @param verifier The PKCE verifier the broker sent with the authorize request.
     * @param redirectUri The broker's callback URL, as sent with the authorize request.
     * @returns The tokens.
     * @throws Error when Auth0 refuses or answers without the tokens. The message never carries a token.
     */
    async exchangeCode(code: string, verifier: string, redirectUri: string): Promise<TokenSet> {
        const { domain, clientId, clientSecret, timeoutMs } = this.auth0;
        const response = await fetch(`https://${domain}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: clientId,
                client_secret: clientSecret,
                code,
                code_verifier: verifier,
                redirect_uri: redirectUri,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
            throw new Error(`Auth0 answered ${response.status} ${typeof body.error === "string" ? body.error : ""}`.trim());
        }
        const { access_token, id_token, token_type, expires_in, scope } = body;
        if (typeof access_token !== "string" || typeof id_token !== "string" || typeof expires_in !== "number") {
            throw new Error("Auth0 answered without the tokens");
        }
        return {
            access_token,
            id_token,
            token_type: typeof token_type === "string" ? token_type : "Bearer",
            expires_in,
            ...(typeof scope === "string" && { scope }),
        };
    }
}
