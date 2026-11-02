import { ApiProperty } from "@nestjs/swagger";
import { IsContactEmail, Trim } from "../../dapps/decorators/dapp-field.decorator";
import { ExpectedVersionRequest } from "../../dapps/requests/expected-version.request";

export class ChangeOwnerRequest extends ExpectedVersionRequest {
    @ApiProperty()
    @Trim()
    @IsContactEmail()
    ownerEmail: string;
}
