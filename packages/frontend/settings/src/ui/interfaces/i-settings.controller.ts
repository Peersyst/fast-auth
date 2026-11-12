import { Locale, Theme, Settings } from "../../common/types";

export interface ISettingsController {
    /**
     * Gets the settings.
     * @returns The settings or undefined if the settings are not defined.
     */
    getSettings(): Promise<Settings | undefined>;
    /**
     * Sets the settings.
     * @param settings The settings to set.
     * @returns A promise that resolves when the settings are set.
     */
    setSettings(settings: Partial<Settings>): Promise<void>;
    /**
     * Gets the locale.
     * @returns The locale or undefined if the locale is not defined.
     */
    getLocale(): Promise<Locale | undefined>;
    /**
     * Sets the locale.
     * @param locale The locale to set.
     * @returns A promise that resolves when the locale is set.
     */
    setLocale(locale: Locale): Promise<void>;
    /**
     * Gets the theme.
     * @returns The theme or undefined if the theme is not defined.
     */
    getTheme(): Promise<Theme | undefined>;
    /**
     * Sets the theme.
     * @param theme The theme to set.
     * @returns A promise that resolves when the theme is set.
     */
    setTheme(theme: Theme): Promise<void>;
}
