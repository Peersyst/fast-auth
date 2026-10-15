import { ApiProperty } from "@nestjs/swagger";
import { IsContactEmail, Trim } from "../../dapps/requests/dapp-field.decorators";
import { ExpectedVersionRequest } from "../../dapps/requests/expected-version.request";

export class ChangeOwnerRequest extends ExpectedVersionRequest {
    @ApiProperty()
    @Trim()
    @IsContactEmail()
    ownerEmail: string;
}
