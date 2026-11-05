import { ApiProperty } from "@nestjs/swagger";
import { REASON_MAX_LENGTH, REASON_MIN_LENGTH } from "@shared/modules/dapp";
import { HasLength, HasNoNul, Trim } from "../../dapp/decorator/dapp-field.decorator";
import { ExpectedVersionRequest } from "../../dapp/requests/expected-version.request";

export class ReasonRequest extends ExpectedVersionRequest {
    @ApiProperty({
        description: `${REASON_MIN_LENGTH}–${REASON_MAX_LENGTH} UTF-16 code units once trimmed (most emoji count as two or more).`,
    })
    @Trim()
    @HasLength(REASON_MIN_LENGTH, REASON_MAX_LENGTH)
    @HasNoNul()
    reason: string;
}
