import { useTranslation } from "react-i18next";

/**
 * Hook to get the current language.
 * @returns The current language.
 */
export function useLanguage(): string {
    const { i18n } = useTranslation();

    return i18n.language;
}
