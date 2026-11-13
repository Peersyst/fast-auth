import { Theme } from "../../common/types";

export interface ISettingsController {
    /**
     * Sets the theme.
     * @param theme The theme to set.
     * @returns A promise that resolves when the theme is set.
     */
    setTheme(theme: Theme): Promise<void>;
}
