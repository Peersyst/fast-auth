import { ApiProperty } from "@nestjs/swagger";
import { HasLength, HasNoNul, Trim } from "../../dapps/requests/dapp-field.decorators";
import { ExpectedVersionRequest } from "../../dapps/requests/expected-version.request";

const REASON_MIN_LENGTH = 10;
const REASON_MAX_LENGTH = 2000;

export class ReasonRequest extends ExpectedVersionRequest {
    @ApiProperty({
        description: `${REASON_MIN_LENGTH}–${REASON_MAX_LENGTH} UTF-16 code units once trimmed (most emoji count as two or more).`,
    })
    @Trim()
    @HasLength(REASON_MIN_LENGTH, REASON_MAX_LENGTH)
    @HasNoNul()
    reason: string;
}
