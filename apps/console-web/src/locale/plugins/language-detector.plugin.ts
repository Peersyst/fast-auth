import { Locale } from "@frontend/settings";
import { LanguageDetectorAsyncModule } from "i18next";
import { ControllerFactory } from "../../core/domain/factories/controller.factory";

/**
 * Detects the language.
 * @returns The language.
 */
export async function detect(): Promise<Locale> {
    try {
        const locale = await ControllerFactory.settingsController.getLocale();
        return locale || "en";
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Error reading language", error);
        return "en";
    }
}

const LanguageDetectorPlugin: LanguageDetectorAsyncModule = {
    type: "languageDetector",
    async: true,
    init: () => {},
    detect,
    cacheUserLanguage: () => {},
};

export default LanguageDetectorPlugin;
