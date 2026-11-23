import { ApiProperty } from "@nestjs/swagger";
import { IsOrigin, NormaliseUrl } from "../decorator/dapp-field.decorator";

export class DappClientRequest {
    @ApiProperty({
        description: "The dApp's web origin, as a browser writes it: scheme, host and port, with no path.",
        example: "https://acme.xyz",
    })
    @NormaliseUrl()
    @IsOrigin()
    origin: string;
}
