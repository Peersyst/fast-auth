import { ApiProperty } from "@nestjs/swagger";
import type { NearNetwork } from "../../../config/console-config";
import { NEAR_NETWORKS } from "../../../config/console-config";

export class ClientConfigResponse {
    @ApiProperty()
    auth0Domain: string;

    @ApiProperty()
    auth0ClientId: string;

    @ApiProperty({ enum: NEAR_NETWORKS })
    nearNetwork: NearNetwork;
}
