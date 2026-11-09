import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UpdateSettingsRequest } from "./requests/update-settings.request";
import { SettingsDto } from "./dtos/settings.dto";

@Injectable()
export class SettingService {
    // Kept in memory: a restart returns to AUTO_APPROVAL_ENABLED, and a change reaches only the instance that handled it.
    private autoApprovalEnabled: boolean;

    constructor(configService: ConfigService) {
        this.autoApprovalEnabled = configService.get<boolean>("admin.autoApprovalEnabled", false);
    }

    /**
     * Reads whether auto-approval is on.
     * @returns Whether auto-approval is on.
     */
    isAutoApprovalEnabled(): boolean {
        return this.autoApprovalEnabled;
    }

    /**
     * Reads the settings.
     * @returns The settings.
     */
    get(): SettingsDto {
        return SettingsDto.fromAutoApproval(this.autoApprovalEnabled);
    }

    /**
     * Applies the settings.
     * @param request The new settings.
     * @returns The settings after the change.
     */
    update(request: UpdateSettingsRequest): SettingsDto {
        this.autoApprovalEnabled = request.autoApproval.enabled;
        return this.get();
    }
}
