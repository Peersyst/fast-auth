import { ApiProperty } from "@nestjs/swagger";

class AutoApprovalSettingsResponse {
    @ApiProperty()
    enabled: boolean;
}

export class SettingsResponse {
    @ApiProperty({ type: AutoApprovalSettingsResponse })
    autoApproval: AutoApprovalSettingsResponse;
}
