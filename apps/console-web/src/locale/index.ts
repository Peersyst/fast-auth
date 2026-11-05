import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import "@frontend/locale";
import { resources } from "@frontend/locale/resources";
import LanguageDetectorPlugin from "./plugins/language-detector.plugin";

export const i18nextInitializationPromise = i18next
    .use(initReactI18next)
    .use(LanguageDetectorPlugin)
    .init({
        fallbackLng: "en",
        resources,
        debug: false,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        returnNull: false,
    });

export default i18next;
