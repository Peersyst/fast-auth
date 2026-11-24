import { ApiProperty } from "@nestjs/swagger";

export class DappClientDto {
    @ApiProperty({ description: "The Auth0 client ID of the approved dApp." })
    clientId: string;
}
