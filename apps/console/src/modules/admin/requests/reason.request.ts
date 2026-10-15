import { ApiProperty } from "@nestjs/swagger";
import { REASON_MAX_LENGTH, REASON_MIN_LENGTH } from "../../../domain/field-rules";
import { HasLength, HasNoNul, Trim } from "../../dapps/requests/dapp-field.decorators";
import { ExpectedVersionRequest } from "../../dapps/requests/expected-version.request";

export class ReasonRequest extends ExpectedVersionRequest {
    @ApiProperty({
        description: `${REASON_MIN_LENGTH}–${REASON_MAX_LENGTH} UTF-16 code units once trimmed (most emoji count as two or more).`,
    })
    @Trim()
    @HasLength(REASON_MIN_LENGTH, REASON_MAX_LENGTH)
    @HasNoNul()
    reason: string;
}
