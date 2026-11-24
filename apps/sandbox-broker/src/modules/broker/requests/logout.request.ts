import { IsOptional, IsUrl } from "class-validator";

/** The logout request auth0-spa-js sends. */
export class LogoutRequest {
    @IsOptional()
    @IsUrl({ protocols: ["http", "https"], require_protocol: true, require_tld: false })
    returnTo?: string;
}
