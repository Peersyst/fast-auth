import { ApiProperty } from "@nestjs/swagger";
import type { Settings } from "../settings.service";

class AutoApprovalSettingsResponse {
    @ApiProperty()
    enabled: boolean;

    @ApiProperty({ description: "The most new submissions auto-approval chooses in any 24 hours." })
    dailyCap: number;
}

export class SettingsResponse {
    @ApiProperty({ type: AutoApprovalSettingsResponse })
    autoApproval: AutoApprovalSettingsResponse;

    /**
     * Maps the settings to the response, copying only the fields the API exposes.
     * @param settings The settings.
     * @param dailyCap The configured auto-approval daily cap.
     * @returns The response.
     */
    static fromSettings(settings: Settings, dailyCap: number): SettingsResponse {
        return { autoApproval: { enabled: settings.autoApproval.enabled, dailyCap } };
    }
}
