import { ApiProperty } from "@nestjs/swagger";

export class AutoApprovalSettingsDto {
    @ApiProperty()
    enabled: boolean;

    @ApiProperty({ description: "The most new submissions auto-approval chooses in any 24 hours." })
    dailyCap: number;
}

export class SettingsDto {
    @ApiProperty({ type: AutoApprovalSettingsDto })
    autoApproval: AutoApprovalSettingsDto;

    /**
     * Builds the settings response from the stored switch and the configured cap.
     * @param enabled Whether auto-approval is on.
     * @param dailyCap The configured auto-approval daily cap.
     * @returns The response.
     */
    static fromAutoApproval(enabled: boolean, dailyCap: number): SettingsDto {
        return { autoApproval: { enabled, dailyCap } };
    }
}
