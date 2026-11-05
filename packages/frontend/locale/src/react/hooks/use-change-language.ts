import { useTranslation } from "react-i18next";

/**
 * Hook to change the current language.
 * @returns Function to change the language.
 */
export function useChangeLanguage(): (locale: string) => void {
    const { i18n } = useTranslation();

    return (locale: string) => {
        i18n.changeLanguage(locale);
    };
}
