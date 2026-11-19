import { IsIn, IsOptional, IsString, IsUrl } from "class-validator";

/** The /authorize request auth0-spa-js sends. Only the params listed here are kept, and passed on to Auth0. */
export class AuthorizeRequest {
    @IsString()
    client_id: string;

    @IsUrl({ protocols: ["http", "https"], require_protocol: true, require_tld: false })
    redirect_uri: string;

    @IsString()
    state: string;

    @IsString()
    code_challenge: string;

    /** `web_message` for popups, which get the answer by postMessage. */
    @IsOptional()
    @IsIn(["query", "web_message"])
    response_mode?: "query" | "web_message";

    @IsOptional()
    @IsString()
    scope?: string;

    @IsOptional()
    @IsString()
    audience?: string;

    @IsOptional()
    @IsString()
    nonce?: string;

    /** The signing payloads the Auth0 action shows on the consent screen. */
    @IsOptional()
    @IsString()
    transaction?: string;

    @IsOptional()
    @IsString()
    delegateAction?: string;

    @IsOptional()
    @IsString()
    nep413?: string;
}
