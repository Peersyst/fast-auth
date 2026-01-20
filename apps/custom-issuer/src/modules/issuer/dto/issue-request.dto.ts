import { IsString, IsNotEmpty, MaxLength, IsNumber, Max, Min } from "class-validator";

export class IssueRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(10000, { message: "JWT token is too long" })
    jwt!: string;

    @IsNotEmpty()
    @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 }, { each: true })
    @Max(255, { each: true })
    @Min(0, { each: true })
    signPayload!: number[];
}
