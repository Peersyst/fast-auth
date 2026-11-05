import { ApiProperty } from "@nestjs/swagger";
import { Auth0Config, NearNetwork } from "../../../config/auth0.config";

export class ClientConfigDto {
    @ApiProperty()
    auth0Domain: string;

    @ApiProperty()
    auth0ClientId: string;

    @ApiProperty({ enum: NearNetwork })
    nearNetwork: NearNetwork;

    /**
     * Picks the Auth0 settings the web app may see, leaving out the provisioner credentials.
     * @param auth0 The Auth0 configuration.
     * @returns The response.
     */
    static fromAuth0Config(auth0: Auth0Config): ClientConfigDto {
        return { auth0Domain: auth0.loginDomain, auth0ClientId: auth0.consoleClientId, nearNetwork: auth0.nearNetwork };
    }
}
