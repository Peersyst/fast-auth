export type Locale = string;

export type Theme = "light" | "dark" | "system";

export type Settings = {
    locale?: Locale;
    theme?: Theme;
};
