import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ConsoleErrorCode } from "../exception/error-codes";
import { ERROR_CODES } from "../exception/error-codes";

export class ErrorDetail {
    @ApiProperty()
    field: string;

    @ApiProperty()
    constraint: string;
}

export class ErrorResponse {
    @ApiProperty()
    statusCode: number;

    @ApiProperty({ enum: Object.keys(ERROR_CODES), enumName: "ErrorCode" })
    code: ConsoleErrorCode;

    @ApiProperty()
    message: string;

    @ApiPropertyOptional({ type: [ErrorDetail] })
    details?: ErrorDetail[];
}
