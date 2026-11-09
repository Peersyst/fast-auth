import { ApiProperty } from "@nestjs/swagger";

export class AutoApprovalSettingsDto {
    @ApiProperty()
    enabled: boolean;
}

export class SettingsDto {
    @ApiProperty({ type: AutoApprovalSettingsDto })
    autoApproval: AutoApprovalSettingsDto;

    /**
     * Builds the settings response from the switch.
     * @param enabled Whether auto-approval is on.
     * @returns The response.
     */
    static fromAutoApproval(enabled: boolean): SettingsDto {
        return { autoApproval: { enabled } };
    }
}
