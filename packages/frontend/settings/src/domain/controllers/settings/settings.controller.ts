import { State } from "@frontend/core/domain/state";
import { Controller } from "@frontend/core/domain/controller";
import { Locale, Theme, Settings } from "../../../common/types";
import { supportedLocales } from "../../../common";
import { ILocalizationService, ISettingsRepository } from "../../interfaces";
import { ISettingsState } from "../../../ui/state";
import { ISettingsController } from "../../../ui/interfaces";

@Controller()
export class SettingsController implements ISettingsController {
    constructor(
        private readonly settingsRepository: ISettingsRepository,
        private readonly localizationService: ILocalizationService,
        readonly settingsState: State<ISettingsState>,
    ) {}

    /**
     * @inheritdoc
     */
    async onInit(): Promise<void> {
        const settings = await this.settingsRepository.getSettings();

        if (settings) {
            this.settingsState.setState(settings);
        }
    }

    /**
     * @inheritdoc
     */
    getSettings(): Promise<Settings | undefined> {
        return this.settingsRepository.getSettings();
    }

    /**
     * @inheritdoc
     */
    async setSettings(settings: Partial<Settings>): Promise<void> {
        this.settingsState.setState(settings);
        return this.settingsRepository.setSettings(settings);
    }

    /**
     * Gets the locale.
     * @returns The locale or undefined if the locale is not defined.
     */
    async getLocale(): Promise<Locale | undefined> {
        const locale = (await this.settingsRepository.getLocale()) || (await this.localizationService.getLocale());

        // Prefer an exact match so already-supported codes (e.g. the hyphenated "zh-CN"/"zh-TW") are preserved as-is.
        const exactMatch = supportedLocales.find((l) => l.toLowerCase() === locale.toLowerCase());
        if (exactMatch) return exactMatch;

        // Fall back to matching the language part of a system locale (e.g. "es", "en-US").
        const systemLocaleEnd = locale.slice(-2).toLowerCase();
        const systemLocaleStart = locale.slice(0, 2).toLowerCase();
        return supportedLocales.find((l) => systemLocaleStart === l || systemLocaleEnd === l) ?? "en";
    }

    /**
     * @inheritdoc
     */
    async setLocale(locale: Locale): Promise<void> {
        this.settingsState.setState({ locale });
        return this.settingsRepository.setLocale(locale);
    }

    /**
     * @inheritdoc
     */
    async getTheme(): Promise<Theme | undefined> {
        return this.settingsRepository.getTheme();
    }

    /**
     * @inheritdoc
     */
    async setTheme(theme: Theme): Promise<void> {
        this.settingsState.setState({ theme });
        return this.settingsRepository.setTheme(theme);
    }
}
