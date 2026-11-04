import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class ExpectedVersionRequest {
    @ApiProperty({ type: "integer", minimum: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    expectedVersion: number;
}
