import { IsString } from "class-validator";

/** The token request auth0-spa-js sends to redeem the broker's code. */
export class TokenRequest {
    @IsString()
    code: string;

    @IsString()
    code_verifier: string;

    @IsString()
    redirect_uri: string;
}
