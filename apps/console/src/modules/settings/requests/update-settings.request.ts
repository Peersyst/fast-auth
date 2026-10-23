import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDefined, ValidateNested } from "class-validator";

class AutoApprovalSettingsRequest {
    @ApiProperty()
    @IsBoolean()
    enabled: boolean;
}

export class UpdateSettingsRequest {
    @ApiProperty({ type: AutoApprovalSettingsRequest })
    @IsDefined()
    @ValidateNested()
    @Type(() => AutoApprovalSettingsRequest)
    autoApproval: AutoApprovalSettingsRequest;
}
