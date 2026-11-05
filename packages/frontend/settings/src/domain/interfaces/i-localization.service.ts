export interface ILocalizationService {
    /**
     * Gets the locale.
     * @returns The locale.
     */
    getLocale(): Promise<string>;
}
