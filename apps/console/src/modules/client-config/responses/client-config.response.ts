import { ApiProperty } from "@nestjs/swagger";
import type { ConsoleConfig } from "../../../config/console-config";
import { NearNetwork } from "../../../config/console-config";

export class ClientConfigResponse {
    @ApiProperty()
    auth0Domain: string;

    @ApiProperty()
    auth0ClientId: string;

    @ApiProperty({ enum: Object.values(NearNetwork) })
    nearNetwork: NearNetwork;

    /**
     * Picks the Auth0 settings the web app may see, leaving out provisioner credentials.
     * @param auth0 The validated auth0 config.
     * @returns The response.
     */
    static fromAuth0Config(auth0: ConsoleConfig["auth0"]): ClientConfigResponse {
        return { auth0Domain: auth0.loginDomain, auth0ClientId: auth0.consoleClientId, nearNetwork: auth0.nearNetwork };
    }
}
