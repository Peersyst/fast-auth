import { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type DSProviderProps = {
    themeMode: ThemeMode;
    children: ReactNode;
};
