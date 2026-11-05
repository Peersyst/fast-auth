import { ApiProperty } from "@nestjs/swagger";
import { IsContactEmail, Trim } from "../../dapp/decorator/dapp-field.decorator";
import { ExpectedVersionRequest } from "../../dapp/requests/expected-version.request";

export class ChangeOwnerRequest extends ExpectedVersionRequest {
    @ApiProperty()
    @Trim()
    @IsContactEmail()
    ownerEmail: string;
}
