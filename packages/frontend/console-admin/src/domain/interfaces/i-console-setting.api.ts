import { SettingsDto, UpdateSettingsRequest } from "@shared/console";

export interface IConsoleSettingApi {
    /**
     * Gets the console's settings.
     */
    get(): Promise<SettingsDto>;
    /**
     * Saves the console's settings.
     */
    update(requestBody: UpdateSettingsRequest): Promise<SettingsDto>;
}
