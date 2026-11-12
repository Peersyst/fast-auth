import { Theme, Settings } from "../../common/types";

export interface ISettingsRepository {
    /**
     * Gets the settings.
     * @returns The settings or undefined if settings are not defined.
     */
    getSettings(): Promise<Settings | undefined>;
    /**
     * Sets the theme.
     * @param theme The theme to set.
     * @returns A promise that resolves when the theme is set.
     */
    setTheme(theme: Theme): Promise<void>;
}
