import { IsOptional, IsString } from "class-validator";

/** Auth0's redirect back to the broker: a code, or an error. */
export class CallbackRequest {
    @IsString()
    state: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    error?: string;

    @IsOptional()
    @IsString()
    error_description?: string;
}
